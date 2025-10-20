import { db } from "../db/db";
import { rooms } from "../db/schema/rooms";
import { playlistItems } from "../db/schema/playlist";
import { roomMembers } from "../db/schema/members";
import { themeAttempts, themeProgress } from "../db/schema/theme";
import { eq, and } from "drizzle-orm";
import { memberScores } from "../db/schema/scores";
import { normalize } from "../utils/text";

// scoring constants
const THEME_BASE_POINTS = 10;
const THEME_STEP_POINTS = 1;
function themeScoreForPosition(pos: number) {
	const v = THEME_BASE_POINTS - THEME_STEP_POINTS * pos;
	return v > 0 ? v : 0;
}

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

	const now = new Date();

	return await db.transaction(async (tx) => {
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

		if (!existing) throw new Error("NO_THEME_ATTEMPT_TO_LOCK");
		if (existing.lockedAt) return { attempt: existing, solved: false as const };

		// lock it
		const [locked] = await tx
			.update(themeAttempts)
			.set({ lockedAt: now })
			.where(eq(themeAttempts.id, existing.id))
			.returning();

		// If room.theme not set, we can’t auto-check (just return)
		if (!room.theme) return { attempt: locked, solved: false as const };

		// If already solved previously, return
		const [prog] = await tx
			.select()
			.from(themeProgress)
			.where(and(eq(themeProgress.roomId, room.id), eq(themeProgress.guesserId, member.id)))
			.limit(1);

		if (prog?.solved) return { attempt: locked, solved: false as const };

		// check correctness
		const isCorrect = normalize(locked.text) === normalize(room.theme);
		if (!isCorrect) return { attempt: locked, solved: false as const };

		// mark attempt + progress
		await tx.update(themeAttempts).set({ isCorrect: true }).where(eq(themeAttempts.id, locked.id));

		if (prog) {
			await tx
				.update(themeProgress)
				.set({ solved: true, solvedAt: now, solvedOnPos: pli.position, attempts: prog.attempts + 1 })
				.where(eq(themeProgress.id, prog.id));
		} else {
			await tx.insert(themeProgress).values({
				roomId: room.id,
				guesserId: member.id,
				solved: true,
				solvedAt: now,
				solvedOnPos: pli.position,
				attempts: 1,
			});
		}

		// award theme points once
		const delta = themeScoreForPosition(pli.position);
		if (delta > 0) {
			const existingScore = await tx
				.select()
				.from(memberScores)
				.where(and(eq(memberScores.roomId, room.id), eq(memberScores.memberId, member.id)))
				.limit(1);

			if (existingScore[0]) {
				await tx
					.update(memberScores)
					.set({
						themePoints: existingScore[0].themePoints + delta,
						totalPoints: existingScore[0].totalPoints + delta,
					})
					.where(eq(memberScores.id, existingScore[0].id));
			} else {
				await tx.insert(memberScores).values({
					roomId: room.id,
					memberId: member.id,
					guessPoints: 0,
					themePoints: delta,
					totalPoints: delta,
				});
			}
		}

		return { attempt: { ...locked, isCorrect: true }, solved: true as const, points: delta };
	});
}
