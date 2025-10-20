import { pgTable, serial, integer, text, timestamp, varchar } from "drizzle-orm/pg-core";
import { rooms } from "./rooms";
import { submitters } from "./submitters";
import { roomMembers } from "./members";

export const submissions = pgTable("submissions", {
	id: serial("id").primaryKey(),
	roomId: integer("room_id")
		.notNull()
		.references(() => rooms.id, { onDelete: "cascade" }),
	submitterId: integer("submitter_id")
		.notNull()
		.references(() => submitters.id, { onDelete: "cascade" }),
	url: text("url").notNull(),
	title: text("title"),
	thumbnailUrl: text("thumbnail_url"),
	provider: varchar("provider", { length: 16 }),
	externalId: varchar("external_id", { length: 64 }),
	addedByMemberId: integer("added_by_member_id").references(() => roomMembers.id, { onDelete: "set null" }),
	revealedAt: timestamp("revealed_at", { mode: "date" }),
	createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
	updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
	durationSeconds: integer("duration_seconds"),
});
