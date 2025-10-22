import { pgTable, serial, integer, text, timestamp, varchar, index, uniqueIndex } from "drizzle-orm/pg-core";
import { rooms } from "./rooms";
import { submitters } from "./submitters";
import { roomMembers } from "./members";
import { sql } from "drizzle-orm";

// A raw song entry tied to a submitter (added by host)
export const submissions = pgTable(
	"submissions",
	{
		id: serial("id").primaryKey(),

		roomId: integer("room_id")
			.notNull()
			.references(() => rooms.id, { onDelete: "cascade" }),

		// Who submitted this song
		submitterId: integer("submitter_id")
			.notNull()
			.references(() => submitters.id, { onDelete: "cascade" }),

		// YouTube URL or other provider link
		url: text("url").notNull(),
		title: text("title"),
		thumbnailUrl: text("thumbnail_url"),

		// "youtube" / "soundcloud" etc.
		provider: varchar("provider", { length: 16 }),
		externalId: varchar("external_id", { length: 64 }), // e.g. YouTube videoId

		// Which member added this entry (host)
		addedByMemberId: integer("added_by_member_id").references(() => roomMembers.id, {
			onDelete: "set null",
		}),

		// Song duration in seconds (for recap playback)
		durationSeconds: integer("duration_seconds"),

		createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => [
		index("submissions_room_idx").on(t.roomId),
		// Prevent duplicate videos within a room
		uniqueIndex("submissions_room_external_uniq")
			.on(t.roomId, t.externalId)
			.where(sql`external_id IS NOT NULL`),
	]
);
