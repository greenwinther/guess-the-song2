import { pgTable, serial, integer, timestamp, boolean, text } from "drizzle-orm/pg-core";
import { rooms } from "./rooms";
import { playlistItems } from "./playlist";
import { roomMembers } from "./members";

export const themeAttempts = pgTable("theme_attempts", {
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
	text: text("text").notNull(),
	lockedAt: timestamp("locked_at", { mode: "date" }),
	autoLocked: boolean("auto_locked").notNull().default(false),
	isCorrect: boolean("is_correct"),
	createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
});

export const themeProgress = pgTable("theme_progress", {
	id: serial("id").primaryKey(),
	roomId: integer("room_id")
		.notNull()
		.references(() => rooms.id, { onDelete: "cascade" }),
	guesserId: integer("guesser_id")
		.notNull()
		.references(() => roomMembers.id, { onDelete: "cascade" }),
	solved: boolean("solved").notNull().default(false),
	solvedAt: timestamp("solved_at", { mode: "date" }),
	solvedOnPos: integer("solved_on_pos"),
	attempts: integer("attempts").notNull().default(0),
	createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});
