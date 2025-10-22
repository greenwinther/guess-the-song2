import { pgTable, serial, integer, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { rooms } from "./rooms";

// Each distinct submitter name that appears in a room
export const submitters = pgTable(
	"submitters",
	{
		id: serial("id").primaryKey(),

		roomId: integer("room_id")
			.notNull()
			.references(() => rooms.id, { onDelete: "cascade" }),

		// Display name written by host ("Alice", "Dennis", etc.)
		name: varchar("name", { length: 64 }).notNull(),

		createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => [
		// Prevent duplicate submitter names inside same room
		uniqueIndex("submitters_room_name_uniq").on(t.roomId, t.name),
	]
);
