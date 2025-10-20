import { pgTable, serial, varchar, integer, boolean, timestamp, text } from "drizzle-orm/pg-core";

export const rooms = pgTable("rooms", {
	id: serial("id").primaryKey(),
	code: varchar("code", { length: 16 }).notNull().unique(),
	theme: text("theme"),
	themeHint: text("theme_hint"),
	backgroundUrl: text("background_url"),
	phase: varchar("phase", { length: 16 }).notNull().default("LOBBY"),
	currentIndex: integer("current_index").notNull().default(0),
	expiresAt: timestamp("expires_at", { mode: "date" }).notNull(),
	isSaved: boolean("is_saved").notNull().default(false),
	savedAt: timestamp("saved_at", { mode: "date" }),
	createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});
