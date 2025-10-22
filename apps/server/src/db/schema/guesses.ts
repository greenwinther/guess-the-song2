import { pgTable, serial, integer, timestamp, boolean, uniqueIndex, index } from "drizzle-orm/pg-core";
import { rooms } from "./rooms";
import { playlistItems } from "./playlist";
import { roomMembers } from "./members";
import { submitters } from "./submitters";

// Each row = one player's guess for one song (playlist item) in a specific room.
export const guesses = pgTable(
	"guesses",
	{
		id: serial("id").primaryKey(),

		// Room this guess belongs to
		roomId: integer("room_id")
			.notNull()
			.references(() => rooms.id, { onDelete: "cascade" }),

		// The song currently in play (playlist_items.id)
		playlistItemId: integer("playlist_item_id")
			.notNull()
			.references(() => playlistItems.id, { onDelete: "cascade" }),

		// The player who made this guess
		guesserId: integer("guesser_id")
			.notNull()
			.references(() => roomMembers.id, { onDelete: "cascade" }),

		// The submitter the player *thinks* made this song
		guessedSubmitterId: integer("guessed_submitter_id")
			.notNull()
			.references(() => submitters.id, { onDelete: "cascade" }),

		// When the guess became locked (manual lock or hardcore auto-lock)
		lockedAt: timestamp("locked_at", { mode: "date" }),

		// Creation timestamp
		createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => [
		// Each player can only have one guess per song
		uniqueIndex("guess_item_member_uniq").on(t.playlistItemId, t.guesserId),
		index("guesses_room_idx").on(t.roomId),
		index("guesses_player_idx").on(t.guesserId),
	]
);
