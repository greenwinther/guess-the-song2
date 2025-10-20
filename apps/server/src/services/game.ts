import { db } from "../db/db";
import { rooms } from "../db/schema/rooms";
import { playlistItems } from "../db/schema/playlist";
import { guesses } from "../db/schema/guesses";
import { themeAttempts, themeProgress } from "../db/schema/theme";
import { eq, and, asc } from "drizzle-orm";
import { memberScores } from "../db/schema/scores";
import { normalize } from "../utils/text";

const THEME_BASE_POINTS = 10;
const THEME_STEP_POINTS = 1;
const themeScoreForPosition = (pos: number) => Math.max(0, THEME_BASE_POINTS - THEME_STEP_POINTS * pos);

/** Start the game: set GUESSING, currentIndex=0, stamp startedAt for first item */
export async function startGameService(roomCode: string) {
	// Load room + first playlist item
	const [room] = await db.select().from(rooms).where(eq(rooms.code, roomCode)).limit(1);
	if (!room) throw new Error("ROOM_NOT_FOUND");

	const items = await db
		.select()
		.from(playlistItems)
		.where(eq(playlistItems.roomId, room.id))
		.orderBy(asc(playlistItems.position));

	if (!items.length) throw new Error("PLAYLIST_EMPTY");

	const first = items[0];

	await db.transaction(async (tx) => {
		// set startedAt on first item if not already set
		const now = new Date();
		await tx
			.update(playlistItems)
			.set({ startedAt: first.startedAt ?? now })
			.where(eq(playlistItems.id, first.id));

		await tx.update(rooms).set({ phase: "GUESSING", currentIndex: 0 }).where(eq(rooms.id, room.id));
	});

	return { roomId: room.id, currentIndex: 0, playlistItemId: first.id };
}

/** Advance to next song.
 *  - end previous item (endedAt)
 *  - autolock hardcore guesses & theme attempts for that index
 *  - increment currentIndex
 *  - stamp startedAt for new item (or switch to RECAP if last was finished)
 */
export async function nextSongService(roomCode: string) {
	const [room] = await db.select().from(rooms).where(eq(rooms.code, roomCode)).limit(1);
	if (!room) throw new Error("ROOM_NOT_FOUND");

	const items = await db
		.select()
		.from(playlistItems)
		.where(eq(playlistItems.roomId, room.id))
		.orderBy(asc(playlistItems.position));

	if (!items.length) throw new Error("PLAYLIST_EMPTY");

	const curIdx = room.currentIndex ?? 0;
	if (curIdx < 0 || curIdx >= items.length) {
		// already past end → ensure phase = RECAP and do nothing
		await db.update(rooms).set({ phase: "RECAP" }).where(eq(rooms.id, room.id));
		return { phase: "RECAP", currentIndex: curIdx };
	}

	const currentItem = items[curIdx];
	const now = new Date();

	return await db.transaction(async (tx) => {
		// 1) End previous item (if not already ended)
		await tx
			.update(playlistItems)
			.set({ endedAt: currentItem.endedAt ?? now })
			.where(eq(playlistItems.id, currentItem.id));

		// 2) Autolock hardcore players’ guesses for this item
		//    (any Guess.row for this (room,item) without lockedAt gets locked)
		await tx
			.update(guesses)
			.set({ lockedAt: now })
			.where(
				and(
					eq(guesses.roomId, room.id),
					eq(guesses.playlistItemId, currentItem.id),
					eq(guesses.lockedAt, null as any)
				)
			);

		// 3) Autolock theme attempts for this item (any unlocked)
		await tx
			.update(themeAttempts)
			.set({ lockedAt: now, autoLocked: true })
			.where(
				and(
					eq(themeAttempts.roomId, room.id),
					eq(themeAttempts.playlistItemId, currentItem.id),
					eq(themeAttempts.lockedAt, null as any)
				)
			);

		// 2b) After auto-locking theme attempts, award solves for this item
		if (room.theme) {
			// fetch newly locked/unscored theme attempts for this item
			const locked = await tx
				.select()
				.from(themeAttempts)
				.where(
					and(
						eq(themeAttempts.roomId, room.id),
						eq(themeAttempts.playlistItemId, currentItem.id)
						// we only care about rows that are now locked (lockedAt not null)
						// correctness evaluated below
					)
				);

			for (const att of locked) {
				// skip if member already solved previously
				const [prog] = await tx
					.select()
					.from(themeProgress)
					.where(and(eq(themeProgress.roomId, room.id), eq(themeProgress.guesserId, att.guesserId)))
					.limit(1);
				if (prog?.solved) continue;

				const isCorrect = normalize(att.text) === normalize(room.theme);
				if (!isCorrect) continue;

				// mark attempt as correct & upsert progress
				await tx.update(themeAttempts).set({ isCorrect: true }).where(eq(themeAttempts.id, att.id));
				const points = themeScoreForPosition(currentItem.position);

				if (prog) {
					await tx
						.update(themeProgress)
						.set({
							solved: true,
							solvedAt: now,
							solvedOnPos: currentItem.position,
							attempts: prog.attempts + 1,
						})
						.where(eq(themeProgress.id, prog.id));
				} else {
					await tx.insert(themeProgress).values({
						roomId: room.id,
						guesserId: att.guesserId,
						solved: true,
						solvedAt: now,
						solvedOnPos: currentItem.position,
						attempts: 1,
					});
				}

				// award points
				const existingScore = await tx
					.select()
					.from(memberScores)
					.where(and(eq(memberScores.roomId, room.id), eq(memberScores.memberId, att.guesserId)))
					.limit(1);

				if (existingScore[0]) {
					await tx
						.update(memberScores)
						.set({
							themePoints: existingScore[0].themePoints + points,
							totalPoints: existingScore[0].totalPoints + points,
						})
						.where(eq(memberScores.id, existingScore[0].id));
				} else {
					await tx.insert(memberScores).values({
						roomId: room.id,
						memberId: att.guesserId,
						guessPoints: 0,
						themePoints: points,
						totalPoints: points,
					});
				}
			}
		}

		// 4) Advance index or switch to RECAP if we just finished the last
		const nextIdx = curIdx + 1;
		if (nextIdx >= items.length) {
			await tx
				.update(rooms)
				.set({ phase: "RECAP", currentIndex: nextIdx })
				.where(eq(rooms.id, room.id));
			return { phase: "RECAP", currentIndex: nextIdx };
		}

		const nextItem = items[nextIdx];
		await tx
			.update(playlistItems)
			.set({ startedAt: nextItem.startedAt ?? now })
			.where(eq(playlistItems.id, nextItem.id));

		await tx.update(rooms).set({ currentIndex: nextIdx }).where(eq(rooms.id, room.id));

		return { phase: room.phase, currentIndex: nextIdx, nextPlaylistItemId: nextItem.id };
	});
}
