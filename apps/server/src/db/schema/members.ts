import {
	pgTable,
	serial,
	integer,
	varchar,
	boolean,
	timestamp,
	uniqueIndex,
	index,
} from "drizzle-orm/pg-core";
import { rooms } from "./rooms";

// One row per connected player or host inside a room
export const roomMembers = pgTable(
	"room_members",
	{
		id: serial("id").primaryKey(),

		roomId: integer("room_id")
			.notNull()
			.references(() => rooms.id, { onDelete: "cascade" }),

		// Display name shown in the lobby and scoreboard
		displayName: varchar("display_name", { length: 64 }).notNull(),

		// "HOST" or "PLAYER"
		role: varchar("role", { length: 16 }).notNull().default("PLAYER"),

		// Unique identifier stored in localStorage to persist identity on refresh
		clientKey: varchar("client_key", { length: 64 }).notNull(),

		// True if this player uses Hardcore mode (auto-locks on next)
		hardcore: boolean("hardcore").notNull().default(false),

		// Cached count of how many songs this player has locked (for quick status UI)
		lockedCount: integer("locked_count").notNull().default(0),

		// Seed to shuffle submitter order deterministically per player
		guessingSeed: integer("guessing_seed").notNull().default(0),

		// === THEME STATUS FLAGS ===
		themeDraftedAt: timestamp("theme_drafted_at", { mode: "date" }), // when they first typed anything
		themeLockedCount: integer("theme_locked_count").notNull().default(0), // how many theme attempts (0–2)
		themeSolved: boolean("theme_solved").notNull().default(false), // set true when theme is correct at reveal

		// === PRESENCE ===
		isActive: boolean("is_active").notNull().default(true),
		lastSeenAt: timestamp("last_seen_at", { mode: "date" }),
		connectedAt: timestamp("connected_at", { mode: "date" }),

		createdAt: timestamp("created_at", { mode: "date" }).notNull().defaultNow(),
		updatedAt: timestamp("updated_at", { mode: "date" }).notNull().defaultNow(),
	},
	(t) => [
		// Prevent duplicate players by clientKey or display name within a room
		uniqueIndex("room_member_room_clientkey_uniq").on(t.roomId, t.clientKey),
		uniqueIndex("room_member_room_name_uniq").on(t.roomId, t.displayName),
		index("room_member_room_idx").on(t.roomId),
	]
);
