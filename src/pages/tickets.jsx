import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { listMedia } from "@/services/tmdb";
import { imgBaseURL } from "@/config/tmdbAPI";
import TheFooter from "@/components/TheFooter";
import AppScroller from "@/components/AppScroller";

const ROWS = ["A", "B", "C", "D", "E", "F", "G", "H", "I", "J"];
const SEATS_PER_ROW = 12;
const MAX_SEATS = 10;
const STANDARD_CENTS = 1150;
const PREMIUM_CENTS = 1600;
const SHOWTIME_CANDIDATES = ["11:20", "13:45", "16:10", "18:35", "21:00", "23:15"];

const seatPrice = (seat) => (seat[0] <= "D" ? STANDARD_CENTS : PREMIUM_CENTS);

const seatSort = (a, b) =>
  a[0] === b[0] ? Number(a.slice(1)) - Number(b.slice(1)) : a[0].localeCompare(b[0]);

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
});

const posterURL = (path) => `${imgBaseURL}/f_webp&s_400x600/tmdb${path}`;

const hashSeed = (str) => {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  return h >>> 0;
};

const mulberry32 = (seed) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

const showtimesFor = (movieId, dateKey) => {
  const rng = mulberry32(hashSeed(`${movieId}:${dateKey}`));
  const start = Math.floor(rng() * 2);
  const count = 3 + Math.floor(rng() * 2);
  return SHOWTIME_CANDIDATES.slice(start, start + count);
};

const pseudoTakenFor = (movieId, showtimeISO) => {
  const rng = mulberry32(hashSeed(`sold:${movieId}:${showtimeISO}`));
  const taken = [];
  for (const row of ROWS) {
    for (let n = 1; n <= SEATS_PER_ROW; n++) {
      if (rng() < 0.3) taken.push(`${row}${n}`);
    }
  }
  return taken;
};

const toDateKey = (date) => {
  const y = date.getFullYear();
  const m = `${date.getMonth() + 1}`.padStart(2, "0");
  const d = `${date.getDate()}`.padStart(2, "0");
  return `${y}-${m}-${d}`;
};

const DATES = Array.from({ length: 5 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() + i);
  return d;
});

const showtimeISO = (dateKey, time) => new Date(`${dateKey}T${time}:00`).toISOString();

const formatDateChip = (date, index) => {
  const weekday = new Intl.DateTimeFormat("en-US", { weekday: "short" }).format(date);
  const day = new Intl.DateTimeFormat("en-US", { day: "numeric", month: "short" }).format(date);
  return { label: index === 0 ? "Today" : weekday, sub: day };
};

const formatShowtime = (iso) =>
  new Intl.DateTimeFormat("en-US", { hour: "numeric", minute: "2-digit" }).format(new Date(iso));

const formatFullShowtime = (iso) =>
  new Intl.DateTimeFormat("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(new Date(iso));

const Step = ({ n, title, done, children }) => (
  <section className="relative pl-12">
    <div className="absolute left-0 top-0 flex h-8 w-8 items-center justify-center rounded-full border border-white/15 bg-[#181818] text-sm font-semibold">
      {done ? <div className="i-ph-check text-primary" /> : <span className={done ? "text-primary" : "opacity-50"}>{n}</span>}
    </div>
    {n > 1 && <div className="absolute left-[15px] bottom-[calc(100%+8px)] top-[-36px] w-px bg-white/10" />}
    <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
    <div className="mt-4">{children}</div>
  </section>
);

const MoviePicker = ({ movies, selected, onSelect, isLoading }) => {
  if (isLoading) {
    return (
      <div className="flex gap-3 overflow-hidden">
        {Array.from({ length: 6 }, (_, i) => (
          <div key={i} className="w-36 shrink-0 animate-pulse">
            <div className="aspect-10/16 bg-white/5" />
            <div className="mt-2 h-3 w-3/4 bg-white/5" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1">
      {movies.map((movie) => {
        const active = selected?.id === movie.id;
        return (
          <button
            key={movie.id}
            type="button"
            onClick={() => onSelect(movie)}
            className={`w-36 shrink-0 text-start transition duration-200 ${
              active ? "scale-[1.03]" : "opacity-70 hover:opacity-100"
            }`}
          >
            <div
              className={`aspect-10/16 overflow-hidden rounded-md border-2 bg-[#9ca3af1a] ${
                active ? "border-[#40c1ad] shadow-[0_0_24px_rgba(64,193,173,0.25)]" : "border-transparent"
              }`}
            >
              {movie.poster_path ? (
                <img
                  src={posterURL(movie.poster_path)}
                  alt={movie.title}
                  className="h-full w-full object-cover"
                  loading="lazy"
                />
              ) : (
                <div className="flex h-full items-center justify-center opacity-30">
                  <div className="i-ph-film-strip text-3xl" />
                </div>
              )}
            </div>
            <div className="mt-2 truncate text-sm" title={movie.title}>
              {movie.title}
            </div>
            <div className="text-xs opacity-50">{movie.release_date?.slice(0, 4)}</div>
          </button>
        );
      })}
    </div>
  );
};

const SeatMap = ({ taken, selected, onToggle, loading }) => (
  <div className="rounded-lg border border-white/10 bg-[#141414] p-4 md:p-6">
    <div className="mx-auto mb-6 max-w-md">
      <div className="h-2 rounded-[100%] border-b-2 border-[#40c1ad]/60 bg-gradient-to-b from-[#40c1ad]/20 to-transparent" />
      <div className="mt-2 text-center text-xs uppercase tracking-[0.4em] opacity-50">Screen</div>
    </div>

    {loading ? (
      <div className="flex flex-col items-center gap-2 py-8">
        {ROWS.map((row) => (
          <div key={row} className="flex animate-pulse gap-1.5">
            {Array.from({ length: SEATS_PER_ROW }, (_, i) => (
              <div key={i} className="h-7 w-7 rounded-t-md bg-white/5" />
            ))}
          </div>
        ))}
      </div>
    ) : (
      <div className="flex flex-col items-center gap-1.5 overflow-x-auto pb-2">
        {ROWS.map((row) => (
          <div key={row} className="flex items-center gap-1.5">
            <div className="w-5 text-center text-[10px] opacity-40">{row}</div>
            {Array.from({ length: SEATS_PER_ROW }, (_, i) => {
              const n = i + 1;
              const id = `${row}${n}`;
              const isTaken = taken.includes(id);
              const isSelected = selected.includes(id);
              const aisle = (n === 3 || n === 11) && i !== 0 ? "ml-4" : "";
              return (
                <button
                  key={id}
                  type="button"
                  disabled={isTaken}
                  title={isTaken ? `${id} · taken` : `${id} · ${currency.format(seatPrice(id) / 100)}`}
                  onClick={() => onToggle(id)}
                  className={`h-7 w-7 shrink-0 rounded-t-md text-[10px] transition duration-150 ${aisle} ${
                    isTaken
                      ? "cursor-not-allowed bg-white/5 opacity-40"
                      : isSelected
                        ? "scale-110 bg-[#40c1ad] text-black"
                        : "bg-[#9ca3af26] hover:bg-[#40c1ad66] hover:scale-105"
                  }`}
                >
                  {n}
                </button>
              );
            })}
            <div className="w-5 text-center text-[10px] opacity-40">{row}</div>
          </div>
        ))}
      </div>
    )}

    <div className="mt-6 flex flex-wrap items-center justify-center gap-5 text-xs opacity-70">
      <span className="flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-t-sm bg-[#9ca3af26]" /> Available
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-t-sm bg-[#40c1ad]" /> Selected
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-t-sm bg-white/5 opacity-40" /> Taken
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-t-sm border border-white/15" /> A–D {currency.format(STANDARD_CENTS / 100)}
      </span>
      <span className="flex items-center gap-2">
        <span className="h-3.5 w-3.5 rounded-t-sm border border-[#40c1ad]/50" /> E–J {currency.format(PREMIUM_CENTS / 100)}
      </span>
    </div>
  </div>
);

const SummaryRail = ({
  movie,
  dateKey,
  showtime,
  seats,
  name,
  email,
  onName,
  onEmail,
  onSubmit,
  submitting,
  error,
  seatsReady,
}) => {
  const total = seats.reduce((sum, s) => sum + seatPrice(s), 0);

  return (
    <aside className="lg:sticky lg:top-6 rounded-lg border border-white/10 bg-[#141414]">
      <div className="border-b border-dashed border-white/15 p-5">
        {movie ? (
          <div className="flex gap-4">
            <div className="w-20 shrink-0 overflow-hidden rounded bg-[#9ca3af1a]">
              {movie.poster_path && (
                <img src={posterURL(movie.poster_path)} alt={movie.title} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0">
              <div className="truncate font-semibold" title={movie.title}>
                {movie.title}
              </div>
              <div className="mt-1 text-sm opacity-60">
                {showtime ? `${formatDateChip(new Date(`${dateKey}T12:00:00`), DATES.findIndex((d) => toDateKey(d) === dateKey)).sub} · ${formatShowtime(showtimeISO(dateKey, showtime))}` : "Pick a showtime"}
              </div>
              <div className="mt-1 text-xs opacity-40">{movie.vote_average?.toFixed(1)} · {Math.round(movie.vote_average * 10)}% liked</div>
            </div>
          </div>
        ) : (
          <div className="text-sm opacity-50">Pick a movie to start your booking.</div>
        )}
      </div>

      <div className="border-b border-dashed border-white/15 p-5">
        {seats.length > 0 ? (
          <div className="space-y-2">
            {seats.map((s) => (
              <div key={s} className="flex items-center justify-between text-sm">
                <span>
                  <span className="font-semibold">{s}</span>
                  <span className="ml-2 text-xs opacity-50">{s[0] <= "D" ? "Standard" : "Premium"}</span>
                </span>
                <span>{currency.format(seatPrice(s) / 100)}</span>
              </div>
            ))}
            <div className="mt-3 flex items-center justify-between border-t border-white/10 pt-3 font-semibold">
              <span>
                Total <span className="text-xs font-normal opacity-50">({seats.length} ticket{seats.length > 1 ? "s" : ""})</span>
              </span>
              <span className="text-primary">{currency.format(total / 100)}</span>
            </div>
          </div>
        ) : (
          <div className="text-sm opacity-50">No seats selected yet.</div>
        )}
      </div>

      <form
        className="p-5"
        onSubmit={(e) => {
          e.preventDefault();
          onSubmit();
        }}
      >
        <label className="block text-xs uppercase tracking-wider opacity-50">Name</label>
        <input
          type="text"
          value={name}
          onChange={(e) => onName(e.target.value)}
          placeholder="Your full name"
          className="mt-1.5 w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition placeholder:opacity-40 focus:border-[#40c1ad]"
        />
        <label className="mt-4 block text-xs uppercase tracking-wider opacity-50">Email</label>
        <input
          type="email"
          value={email}
          onChange={(e) => onEmail(e.target.value)}
          placeholder="you@example.com"
          className="mt-1.5 w-full rounded border border-white/10 bg-black/30 px-3 py-2 text-sm outline-none transition placeholder:opacity-40 focus:border-[#40c1ad]"
        />
        {error && <div className="mt-3 rounded border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">{error}</div>}
        <button
          type="submit"
          disabled={!seatsReady || submitting}
          className="mt-4 flex w-full items-center justify-center gap-2 rounded bg-[#40c1ad] py-2.5 font-semibold text-black transition duration-200 hover:bg-[#5fd6c0] disabled:cursor-not-allowed disabled:opacity-30"
        >
          <div className="i-ph-ticket" />
          {submitting ? "Booking…" : `Confirm · ${currency.format(total / 100)}`}
        </button>
        <p className="mt-3 text-center text-[11px] opacity-40">Checkout is simulated — no payment is processed.</p>
      </form>
    </aside>
  );
};

const Confirmation = ({ booking, onReset }) => (
  <div className="mx-auto max-w-xl">
    <div className="relative overflow-hidden rounded-lg border border-[#40c1ad]/30 bg-[#141414]">
      <div className="bg-gradient-to-b from-[#40c1ad]/15 to-transparent p-8 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-[#40c1ad] text-black">
          <div className="i-ph-check text-2xl" />
        </div>
        <h2 className="mt-4 text-2xl font-semibold tracking-tight">          You&apos;re going to the movies!</h2>
        <p className="mt-1 text-sm opacity-60">
          {booking.seatCount} ticket{booking.seatCount > 1 ? "s" : ""} for <span className="font-medium text-white">{booking.movieTitle}</span>
        </p>
      </div>
      <div className="border-t border-dashed border-white/15 p-8">
        <div className="text-center">
          <div className="text-xs uppercase tracking-[0.3em] opacity-50">Booking reference</div>
          <div className="mt-2 font-mono text-3xl tracking-widest text-primary">{booking.reference}</div>
        </div>
        <dl className="mt-8 space-y-3 text-sm">
          <div className="flex justify-between gap-4">
            <dt className="opacity-50">Showtime</dt>
            <dd className="text-end">{formatFullShowtime(booking.showtime)}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="opacity-50">Seats</dt>
            <dd className="text-end font-medium">{booking.seats.join(", ")}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="opacity-50">Name</dt>
            <dd>{booking.customerName}</dd>
          </div>
          <div className="flex justify-between gap-4">
            <dt className="opacity-50">Total paid</dt>
            <dd className="font-semibold text-primary">{currency.format(booking.totalCents / 100)}</dd>
          </div>
        </dl>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <button
            type="button"
            onClick={onReset}
            className="flex items-center gap-2 rounded-lg border border-white/10 px-5 py-2.5 text-sm transition hover:bg-[#9ca3af26]"
          >
            <div className="i-ph-ticket" /> Book another showing
          </button>
          <Link
            to="/movie"
            className="flex items-center rounded-lg bg-[#40c1ad] px-5 py-2.5 text-sm font-semibold text-black transition hover:bg-[#5fd6c0]"
          >
            Browse more movies
          </Link>
        </div>
      </div>
    </div>
  </div>
);

const Tickets = () => {
  const [searchParams] = useSearchParams();
  const queryClient = useQueryClient();

  const [selectedMovie, setSelectedMovie] = useState(null);
  const [dateKey, setDateKey] = useState(toDateKey(DATES[0]));
  const [showtime, setShowtime] = useState(null);
  const [seats, setSeats] = useState([]);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [booking, setBooking] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  const {
    data: moviesData,
    isLoading: moviesLoading,
    refetch: refetchMovies,
  } = useQuery({
    queryKey: ["tickets", "now_playing"],
    queryFn: () => listMedia("movie", "now_playing", 1),
    staleTime: 5 * 60 * 1000,
  });
  const movies = moviesData?.results || [];

  useEffect(() => {
    if (moviesLoading || !movies.length || selectedMovie) return;
    const wanted = Number(searchParams.get("movie"));
    const match = movies.find((m) => m.id === wanted);
    setSelectedMovie(match || null);
  }, [movies, moviesLoading, searchParams, selectedMovie]);

  useEffect(() => {
    setShowtime(null);
    setSeats([]);
    setBooking(null);
  }, [selectedMovie?.id, dateKey]);

  useEffect(() => {
    setSeats([]);
    setBooking(null);
  }, [showtime]);

  const selectedShowtimeISO = selectedMovie && showtime ? showtimeISO(dateKey, showtime) : null;

  const { data: seatsData, isLoading: seatsLoading } = useQuery({
    queryKey: ["takenSeats", selectedMovie?.id, selectedShowtimeISO],
    queryFn: async () => {
      const res = await fetch(`/api/bookings?movieId=${selectedMovie.id}&showtime=${encodeURIComponent(selectedShowtimeISO)}`);
      if (!res.ok) throw new Error("Failed to load seat availability");
      return res.json();
    },
    enabled: !!selectedMovie && !!selectedShowtimeISO,
    staleTime: 10 * 1000,
  });

  const showtimes = useMemo(
    () => (selectedMovie ? showtimesFor(selectedMovie.id, dateKey) : []),
    [selectedMovie, dateKey],
  );

  const soldOut = useMemo(() => {
    if (!selectedMovie) return {};
    const map = {};
    for (const time of showtimes) {
      const iso = showtimeISO(dateKey, time);
      const rng = mulberry32(hashSeed(`out:${selectedMovie.id}:${iso}`));
      map[time] = rng() < 0.15;
    }
    return map;
  }, [selectedMovie, showtimes, dateKey]);

  const taken = useMemo(() => {
    if (!selectedMovie || !selectedShowtimeISO) return [];
    const sold = new Set(pseudoTakenFor(selectedMovie.id, selectedShowtimeISO));
    for (const s of seatsData?.taken || []) sold.add(s);
    return [...sold];
  }, [selectedMovie, selectedShowtimeISO, seatsData]);

  useEffect(() => {
    setSeats((current) => (current.length ? current.filter((s) => !taken.includes(s)) : current));
  }, [taken]);

  const toggleSeat = (id) => {
    setError(null);
    setSeats((current) => {
      if (current.includes(id)) return current.filter((s) => s !== id);
      if (current.length >= MAX_SEATS || taken.includes(id)) return current;
      return [...current, id].sort(seatSort);
    });
  };

  const submitBooking = async () => {
    if (!selectedMovie || !selectedShowtimeISO || seats.length === 0) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/bookings", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          movieId: selectedMovie.id,
          movieTitle: selectedMovie.title,
          posterPath: selectedMovie.poster_path,
          showtime: selectedShowtimeISO,
          seats,
          customerName: name,
          customerEmail: email,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (res.status === 409) {
          setError(`Seat ${data.conflicts?.join(", ")} was just taken — please pick another.`);
          queryClient.invalidateQueries({ queryKey: ["takenSeats"] });
        } else {
          setError(data.error || "Something went wrong. Please try again.");
        }
        return;
      }
      setBooking(data.booking);
    } catch {
      setError("Could not reach the box office. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const resetBooking = () => {
    setBooking(null);
    setSelectedMovie(null);
    setDateKey(toDateKey(DATES[0]));
    setShowtime(null);
    setSeats([]);
    setName("");
    setEmail("");
    setError(null);
  };

  const stepsDone = [!!selectedMovie, !!showtime, seats.length > 0];

  return (
    <AppScroller>
      <title>Book Tickets · React Movies</title>
      <div className="mx-auto max-w-6xl px-6 py-10 lg:px-10">
        <header className="mb-10">
          <div className="flex items-center gap-3 text-primary">
            <div className="i-ph-ticket text-3xl" />
            <h1 className="text-3xl font-semibold tracking-tight">Buy Tickets</h1>
          </div>
          <p className="mt-2 max-w-xl text-sm opacity-60">
            Now showing in theaters — pick a film, a showtime and your seats. Tickets are held under your name at the box office.
          </p>
        </header>

        {booking ? (
          <Confirmation booking={booking} onReset={resetBooking} />
        ) : (
          <div className="grid items-start gap-10 lg:grid-cols-[1fr_340px]">
            <div className="space-y-10">
              <Step n={1} title="Choose a movie" done={stepsDone[0]}>
                {moviesLoading ? (
                  <MoviePicker isLoading />
                ) : movies.length === 0 ? (
                  <div className="rounded-lg border border-white/10 bg-[#141414] p-8 text-center">
                    <div className="text-sm opacity-60">No showings available right now.</div>
                    <button type="button" onClick={() => refetchMovies()} className="n-link mt-2 text-sm text-primary">
                      Try again
                    </button>
                  </div>
                ) : (
                  <MoviePicker movies={movies} selected={selectedMovie} onSelect={setSelectedMovie} />
                )}
              </Step>

              <Step n={2} title="Pick a date & time" done={stepsDone[1]}>
                {!selectedMovie ? (
                  <p className="text-sm opacity-40">Select a movie first.</p>
                ) : (
                  <div className="flex flex-wrap items-center gap-2">
                    {DATES.map((date, i) => {
                      const key = toDateKey(date);
                      const chip = formatDateChip(date, i);
                      return (
                        <button
                          key={key}
                          type="button"
                          onClick={() => setDateKey(key)}
                          className={`rounded-lg border px-4 py-2 text-sm transition duration-150 ${
                            dateKey === key
                              ? "border-[#40c1ad] bg-[#40c1ad]/10 text-white"
                              : "border-white/10 opacity-60 hover:border-white/25 hover:opacity-100"
                          }`}
                        >
                          <div className="font-medium">{chip.label}</div>
                          <div className="text-xs opacity-60">{chip.sub}</div>
                        </button>
                      );
                    })}
                    <div className="h-8 w-px bg-white/10" />
                    {showtimes.map((time) => {
                      const iso = showtimeISO(dateKey, time);
                      const out = soldOut[time];
                      return (
                        <button
                          key={time}
                          type="button"
                          disabled={out}
                          onClick={() => setShowtime(time)}
                          className={`rounded-full border px-4 py-2 text-sm transition duration-150 ${
                            out
                              ? "cursor-not-allowed border-white/5 text-white/20 line-through"
                              : showtime === time
                                ? "border-[#40c1ad] bg-[#40c1ad] font-semibold text-black"
                                : "border-white/10 opacity-60 hover:border-[#40c1ad]/60 hover:opacity-100"
                          }`}
                        >
                          {formatShowtime(iso)}
                        </button>
                      );
                    })}
                  </div>
                )}
              </Step>

              <Step n={3} title="Select your seats" done={stepsDone[2]}>
                {!selectedMovie || !showtime ? (
                  <p className="text-sm opacity-40">Pick a showtime to see the seat map.</p>
                ) : (
                  <>
                    <SeatMap taken={taken} selected={seats} onToggle={toggleSeat} loading={seatsLoading} />
                    {seats.length >= MAX_SEATS && (
                      <p className="mt-3 text-xs text-[#40c1ad]">Maximum of {MAX_SEATS} seats per booking.</p>
                    )}
                  </>
                )}
              </Step>
            </div>

            <SummaryRail
              movie={selectedMovie}
              dateKey={dateKey}
              showtime={showtime}
              seats={seats}
              name={name}
              email={email}
              onName={setName}
              onEmail={setEmail}
              onSubmit={submitBooking}
              submitting={submitting}
              error={error}
              seatsReady={selectedMovie && showtime && seats.length > 0 && name.trim().length >= 2 && email.includes("@")}
            />
          </div>
        )}
      </div>
      <TheFooter />
    </AppScroller>
  );
};

export default Tickets;
