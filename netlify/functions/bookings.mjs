import { randomBytes } from "node:crypto";
import { and, eq } from "drizzle-orm";

import { db } from "../../db/index.js";
import { bookings } from "../../db/schema.js";

const SEAT_RE = /^[A-J](?:[1-9]|1[0-2])$/;
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const seatPriceCents = (seat) => (seat[0] <= "D" ? 1150 : 1600);

const makeReference = () => {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const bytes = randomBytes(6);
  let code = "";
  for (const byte of bytes) code += alphabet[byte % alphabet.length];
  return `RMT-${code}`;
};

const json = (data, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: { "content-type": "application/json" },
  });

export default async (req) => {
  const url = new URL(req.url);

  if (req.method === "GET") {
    const reference = url.searchParams.get("reference");
    if (reference) {
      const [booking] = await db
        .select()
        .from(bookings)
        .where(eq(bookings.reference, reference.toUpperCase()));
      if (!booking) return json({ error: "Booking not found" }, 404);
      return json({ booking });
    }

    const movieId = Number(url.searchParams.get("movieId"));
    const showtime = url.searchParams.get("showtime");
    if (!Number.isInteger(movieId) || movieId <= 0 || !showtime) {
      return json({ error: "movieId and showtime are required" }, 400);
    }
    const showtimeDate = new Date(showtime);
    if (Number.isNaN(showtimeDate.getTime())) {
      return json({ error: "Invalid showtime" }, 400);
    }

    const rows = await db
      .select({ seats: bookings.seats })
      .from(bookings)
      .where(and(eq(bookings.movieId, movieId), eq(bookings.showtime, showtimeDate)));

    const taken = rows.flatMap((row) => row.seats);
    return json({ taken });
  }

  if (req.method === "POST") {
    let body;
    try {
      body = await req.json();
    } catch {
      return json({ error: "Invalid JSON body" }, 400);
    }

    const { movieId, movieTitle, posterPath, showtime, seats, customerName, customerEmail } = body;

    if (!Number.isInteger(movieId) || movieId <= 0) {
      return json({ error: "A valid movieId is required" }, 400);
    }
    if (typeof movieTitle !== "string" || movieTitle.trim().length === 0 || movieTitle.length > 200) {
      return json({ error: "A valid movieTitle is required" }, 400);
    }
    const showtimeDate = new Date(showtime);
    if (!(showtimeDate instanceof Date) || Number.isNaN(showtimeDate.getTime())) {
      return json({ error: "A valid showtime is required" }, 400);
    }
    if (!Array.isArray(seats) || seats.length === 0 || seats.length > 10) {
      return json({ error: "Select between 1 and 10 seats" }, 400);
    }
    if (!seats.every((seat) => typeof seat === "string" && SEAT_RE.test(seat))) {
      return json({ error: "Invalid seat selection" }, 400);
    }
    const uniqueSeats = [...new Set(seats)].sort();
    if (typeof customerName !== "string" || customerName.trim().length < 2 || customerName.length > 80) {
      return json({ error: "A valid name is required" }, 400);
    }
    if (typeof customerEmail !== "string" || !EMAIL_RE.test(customerEmail) || customerEmail.length > 200) {
      return json({ error: "A valid email is required" }, 400);
    }

    const existing = await db
      .select({ seats: bookings.seats })
      .from(bookings)
      .where(and(eq(bookings.movieId, movieId), eq(bookings.showtime, showtimeDate)));

    const taken = new Set(existing.flatMap((row) => row.seats));
    const conflicts = uniqueSeats.filter((seat) => taken.has(seat));
    if (conflicts.length > 0) {
      return json({ error: "Some seats were just taken", conflicts }, 409);
    }

    const totalCents = uniqueSeats.reduce((sum, seat) => sum + seatPriceCents(seat), 0);

    const [booking] = await db
      .insert(bookings)
      .values({
        reference: makeReference(),
        movieId,
        movieTitle: movieTitle.trim(),
        posterPath: typeof posterPath === "string" ? posterPath : null,
        showtime: showtimeDate,
        seats: uniqueSeats,
        seatCount: uniqueSeats.length,
        totalCents,
        customerName: customerName.trim(),
        customerEmail: customerEmail.trim().toLowerCase(),
      })
      .returning();

    return json({ booking }, 201);
  }

  return json({ error: "Method not allowed" }, 405);
};

export const config = {
  path: "/api/bookings",
};
