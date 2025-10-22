import { pgTable, serial, integer, timestamp, uniqueIndex, index } from "drizzle-orm/pg-core";
import { rooms } from "./rooms";
import { submissions } from "./submissions";

// One row per song in the room's ordered playlist
export const playlistItems = pgTable(
	"playlist_items",
	{
		id: serial("id").primaryKey(),

		roomId: integer("room_id")
			.notNull()
			.references(() => rooms.id, { onDelete: "cascade" }),

		// The actual song submission data
		submissionId: integer("submission_id")
			.notNull()
			.references(() => submissions.id, { onDelete: "cascade" }),

		// Position in playlist (0-based)
		position: integer("position").notNull(),

		// When host started/ended playback for this song
		startedAt: timestamp("started_at", { mode: "date" }),
		endedAt: timestamp("ended_at", { mode: "date" }),

		// === ROUND CONTROL TIMERS ===
		nextedAt: timestamp("nexted_at", { mode: "date" }), // when host pressed NEXT
		autoLockDeadlineAt: timestamp("auto_lock_deadline_at", { mode: "date" }), // Hardcore auto-lock time
		guessesLockedAt: timestamp("guesses_locked_at", { mode: "date" }), // when host force-locked all
		revealedAt: timestamp("revealed_at", { mode: "date" }), // when host revealed submitter
	},
	(t) => [
		uniqueIndex("playlist_room_pos_uniq").on(t.roomId, t.position),
		uniqueIndex("playlist_room_submission_uniq").on(t.roomId, t.submissionId),
		index("playlist_room_idx").on(t.roomId),
	]
);
