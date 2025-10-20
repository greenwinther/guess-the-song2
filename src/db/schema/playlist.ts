import { pgTable, serial, integer, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { rooms } from "./rooms";
import { submissions } from "./submissions";

export const playlistItems = pgTable(
	"playlist_items",
	{
		id: serial("id").primaryKey(),
		roomId: integer("room_id")
			.notNull()
			.references(() => rooms.id, { onDelete: "cascade" }),
		submissionId: integer("submission_id")
			.notNull()
			.references(() => submissions.id, { onDelete: "cascade" }),
		position: integer("position").notNull(),
		startedAt: timestamp("started_at", { mode: "date" }),
		endedAt: timestamp("ended_at", { mode: "date" }),
	},
	(t) => ({
		uniqPos: uniqueIndex("playlist_room_pos_uniq").on(t.roomId, t.position),
		uniqSub: uniqueIndex("playlist_room_submission_uniq").on(t.roomId, t.submissionId),
	})
);
