import { db } from "../db/db";
import { rooms } from "../db/schema/rooms";
import { playlistItems } from "../db/schema/playlist";
import { roomMembers } from "../db/schema/members";
import { themeAttempts, themeProgress } from "../db/schema/theme";
import { eq, and } from "drizzle-orm";

function assertPhase(phase?: string) {
	if (phase !== "GUESSING" && phase !== "RECAP") {
		throw new Error("PHASE_FORBIDS_THEME");
	}
}

export async function upsertThemeAttemptService(args: {
	roomCode: string;
	playlistItemId: number;
	guesserId: number;
	text: string;
}) {
	const [room] = await db.select().from(rooms).where(eq(rooms.code, args.roomCode)).limit(1);
	if (!room) throw new Error("ROOM_NOT_FOUND");
	assertPhase(room.phase);

	const [pli] = await db
		.select()
		.from(playlistItems)
		.where(eq(playlistItems.id, args.playlistItemId))
		.limit(1);
	if (!pli || pli.roomId !== room.id) throw new Error("INVALID_PLAYLIST_ITEM");

	const [member] = await db.select().from(roomMembers).where(eq(roomMembers.id, args.guesserId)).limit(1);
	if (!member || member.roomId !== room.id) throw new Error("INVALID_MEMBER");

	// If they already solved the theme, no more attempts
	const [prog] = await db
		.select()
		.from(themeProgress)
		.where(and(eq(themeProgress.roomId, room.id), eq(themeProgress.guesserId, member.id)))
		.limit(1);
	if (prog?.solved) throw new Error("THEME_ALREADY_SOLVED");

	// Hardcore rule: cannot edit past rounds
	if (member.hardcore && pli.position < room.currentIndex) {
		throw new Error("HARDCORE_LOCKED_PREVIOUS");
	}

	return await db.transaction(async (tx) => {
		// Ensure a single attempt per round per player
		const [existing] = await tx
			.select()
			.from(themeAttempts)
			.where(
				and(
					eq(themeAttempts.roomId, room.id),
					eq(themeAttempts.playlistItemId, pli.id),
					eq(themeAttempts.guesserId, member.id)
				)
			)
			.limit(1);

		if (existing?.lockedAt) throw new Error("THEME_ATTEMPT_LOCKED");

		if (existing) {
			const [upd] = await tx
				.update(themeAttempts)
				.set({ text: args.text })
				.where(eq(themeAttempts.id, existing.id))
				.returning();
			return { attempt: upd };
		} else {
			const [ins] = await tx
				.insert(themeAttempts)
				.values({
					roomId: room.id,
					playlistItemId: pli.id,
					guesserId: member.id,
					text: args.text,
				})
				.returning();
			return { attempt: ins };
		}
	});
}

export async function lockThemeAttemptService(args: {
	roomCode: string;
	playlistItemId: number;
	guesserId: number;
}) {
	const [room] = await db.select().from(rooms).where(eq(rooms.code, args.roomCode)).limit(1);
	if (!room) throw new Error("ROOM_NOT_FOUND");
	assertPhase(room.phase);

	const [pli] = await db
		.select()
		.from(playlistItems)
		.where(eq(playlistItems.id, args.playlistItemId))
		.limit(1);
	if (!pli || pli.roomId !== room.id) throw new Error("INVALID_PLAYLIST_ITEM");

	const [member] = await db.select().from(roomMembers).where(eq(roomMembers.id, args.guesserId)).limit(1);
	if (!member || member.roomId !== room.id) throw new Error("INVALID_MEMBER");

	const [existing] = await db
		.select()
		.from(themeAttempts)
		.where(
			and(
				eq(themeAttempts.roomId, room.id),
				eq(themeAttempts.playlistItemId, pli.id),
				eq(themeAttempts.guesserId, member.id)
			)
		)
		.limit(1);

	if (!existing) throw new Error("NO_THEME_ATTEMPT_TO_LOCK");
	if (existing.lockedAt) return { attempt: existing };

	const [locked] = await db
		.update(themeAttempts)
		.set({ lockedAt: new Date() })
		.where(eq(themeAttempts.id, existing.id))
		.returning();

	return { attempt: locked };
}
