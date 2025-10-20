import { pgTable, serial, integer, varchar, timestamp, uniqueIndex } from "drizzle-orm/pg-core";
import { rooms } from "./rooms";

export const submitters = pgTable(
	"submitters",
	{
		id: serial("id").primaryKey(),
		roomId: integer("room_id")
			.notNull()
			.references(() => rooms.id, { onDelete: "cascade" }),
		name: varchar("name", { length: 64 }).notNull(),
		createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => ({
		uniquePerRoom: uniqueIndex("submitters_room_name_uniq").on(t.roomId, t.name),
	})
);
