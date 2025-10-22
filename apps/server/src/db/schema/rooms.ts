import { pgTable, serial, varchar, integer, boolean, timestamp, text } from "drizzle-orm/pg-core";

// One row per active or saved game session
export const rooms = pgTable("rooms", {
	id: serial("id").primaryKey(),

	// Unique join code displayed in lobby
	code: varchar("code", { length: 16 }).notNull().unique(),

	// === THEME INFO (editable by host in lobby) ===
	theme: text("theme"),
	themeHint: text("theme_hint"),
	backgroundUrl: text("background_url"),

	// === GAME STATE ===
	phase: varchar("phase", { length: 16 }).notNull().default("LOBBY"), // LOBBY/GAME/RECAP/REVEAL/RESULTS
	currentIndex: integer("current_index").notNull().default(0),

	// === SCORING & SETTINGS ===
	guessPoints: integer("guess_points").notNull().default(1),
	themePoints: integer("theme_points").notNull().default(0),
	autoLockDelaySeconds: integer("auto_lock_delay_seconds").notNull().default(5), // Hardcore delay after NEXT

	// === TIMERS ===
	finalLockDeadlineAt: timestamp("final_lock_deadline_at", { mode: "date" }), // global final lock countdown
	recapSecondsPerItem: integer("recap_seconds_per_item"), // optional per-song recap length
	themeRevealedAt: timestamp("theme_revealed_at", { mode: "date" }),

	// === LIFECYCLE ===
	expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
	isSaved: boolean("is_saved").notNull().default(false),
	savedAt: timestamp("saved_at", { mode: "date" }),

	createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});
