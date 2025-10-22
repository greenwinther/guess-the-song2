import { pgTable, serial, integer, timestamp, boolean, text, uniqueIndex, index } from "drizzle-orm/pg-core";
import { rooms } from "./rooms";
import { roomMembers } from "./members";

// === Live editable text (draft) ===
// Keeps the player's latest theme guess before locking.
// Only one row per player.
export const themeGuesses = pgTable(
	"theme_guesses",
	{
		id: serial("id").primaryKey(),
		roomId: integer("room_id")
			.notNull()
			.references(() => rooms.id, { onDelete: "cascade" }),
		guesserId: integer("guesser_id")
			.notNull()
			.references(() => roomMembers.id, { onDelete: "cascade" }),
		text: text("text").notNull(), // latest draft text
		updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("theme_guess_room_player_uniq").on(t.roomId, t.guesserId),
		index("theme_guesses_room_idx").on(t.roomId),
	]
);

// === Locked attempts (1–2 per player) ===
// Stored when a player clicks "Lock theme guess"
export const themeOverallAttempts = pgTable(
	"theme_overall_attempts",
	{
		id: serial("id").primaryKey(),
		roomId: integer("room_id")
			.notNull()
			.references(() => rooms.id, { onDelete: "cascade" }),
		guesserId: integer("guesser_id")
			.notNull()
			.references(() => roomMembers.id, { onDelete: "cascade" }),

		attemptNo: integer("attempt_no").notNull(), // 1 or 2
		text: text("text").notNull(),
		lockedAt: timestamp("locked_at", { mode: "date" }).notNull(),

		// Filled at reveal if correct
		isCorrect: boolean("is_correct"),

		createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => [
		uniqueIndex("theme_overall_room_player_attempt_uniq").on(t.roomId, t.guesserId, t.attemptNo),
		index("theme_overall_room_idx").on(t.roomId),
		index("theme_overall_player_idx").on(t.guesserId),
	]
);
