import { pgTable, serial, integer, timestamp } from "drizzle-orm/pg-core";
import { rooms } from "./rooms";
import { roomMembers } from "./members";

// Aggregated score totals for each member in a room
export const memberScores = pgTable("member_scores", {
	id: serial("id").primaryKey(),

	roomId: integer("room_id")
		.notNull()
		.references(() => rooms.id, { onDelete: "cascade" }),

	memberId: integer("member_id")
		.notNull()
		.references(() => roomMembers.id, { onDelete: "cascade" }),

	// Points earned for correct submitter guesses
	guessPoints: integer("guess_points").notNull().default(0),

	// Points earned for correct theme (future use)
	themePoints: integer("theme_points").notNull().default(0),

	// Cached sum for fast leaderboard queries
	totalPoints: integer("total_points").notNull().default(0),

	updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
});
