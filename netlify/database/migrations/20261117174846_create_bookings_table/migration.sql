CREATE TABLE "bookings" (
	"id" serial PRIMARY KEY,
	"reference" text NOT NULL UNIQUE,
	"movie_id" integer NOT NULL,
	"movie_title" text NOT NULL,
	"poster_path" text,
	"showtime" timestamp with time zone NOT NULL,
	"seats" jsonb NOT NULL,
	"seat_count" integer NOT NULL,
	"total_cents" integer NOT NULL,
	"customer_name" text NOT NULL,
	"customer_email" text NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "bookings_movie_showtime_idx" ON "bookings" ("movie_id","showtime");