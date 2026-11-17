import { index, integer, jsonb, pgTable, serial, text, timestamp } from "drizzle-orm/pg-core";

export const bookings = pgTable(
  "bookings",
  {
    id: serial().primaryKey(),
    reference: text("reference").notNull().unique(),
    movieId: integer("movie_id").notNull(),
    movieTitle: text("movie_title").notNull(),
    posterPath: text("poster_path"),
    showtime: timestamp("showtime", { withTimezone: true }).notNull(),
    seats: jsonb("seats").$type<string[]>().notNull(),
    seatCount: integer("seat_count").notNull(),
    totalCents: integer("total_cents").notNull(),
    customerName: text("customer_name").notNull(),
    customerEmail: text("customer_email").notNull(),
    createdAt: timestamp("created_at").defaultNow().notNull(),
  },
  (table) => [index("bookings_movie_showtime_idx").on(table.movieId, table.showtime)],
);
