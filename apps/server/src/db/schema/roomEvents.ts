import { index, integer, jsonb, pgTable, serial, timestamp, varchar } from "drizzle-orm/pg-core";
import { rooms } from "./rooms";

// Immutable audit log for debugging and analytics (optional but very handy)
export const roomEvents = pgTable(
	"room_events",
	{
		id: serial("id").primaryKey(),

		roomId: integer("room_id")
			.notNull()
			.references(() => rooms.id, { onDelete: "cascade" }),

		// Event type, e.g. "NEXT", "FORCE_SUBMIT", "REVEAL_ITEM", "RESULTS"
		type: varchar("type", { length: 32 }).notNull(),

		// Arbitrary JSON data about the event (song id, timestamp, etc.)
		payload: jsonb("payload"),

		createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => [index("room_events_room_idx").on(t.roomId)]
);
