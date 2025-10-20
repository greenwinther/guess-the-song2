import { pgTable, serial, integer, varchar, boolean, timestamp } from "drizzle-orm/pg-core";
import { rooms } from "./rooms";

export const roomMembers = pgTable("room_members", {
	id: serial("id").primaryKey(),
	roomId: integer("room_id")
		.notNull()
		.references(() => rooms.id, { onDelete: "cascade" }),
	displayName: varchar("display_name", { length: 64 }).notNull(),
	role: varchar("role", { length: 16 }).notNull().default("PLAYER"),
	hardcore: boolean("hardcore").notNull().default(false),
	clientKey: varchar("client_key", { length: 64 }).notNull(),
	guessingSeed: integer("guessing_seed").notNull().default(0),
	isActive: boolean("is_active").notNull().default(true),
	createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});
