import { pgTable, serial, integer, timestamp, boolean } from "drizzle-orm/pg-core";
import { rooms } from "./rooms";
import { playlistItems } from "./playlist";
import { roomMembers } from "./members";
import { submitters } from "./submitters";

export const guesses = pgTable("guesses", {
	id: serial("id").primaryKey(),
	roomId: integer("room_id")
		.notNull()
		.references(() => rooms.id, { onDelete: "cascade" }),
	playlistItemId: integer("playlist_item_id")
		.notNull()
		.references(() => playlistItems.id, { onDelete: "cascade" }),
	guesserId: integer("guesser_id")
		.notNull()
		.references(() => roomMembers.id, { onDelete: "cascade" }),
	guessedSubmitterId: integer("guessed_submitter_id")
		.notNull()
		.references(() => submitters.id, { onDelete: "cascade" }),
	lockedAt: timestamp("locked_at", { mode: "date" }),
	isCorrect: boolean("is_correct"),
	createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});
