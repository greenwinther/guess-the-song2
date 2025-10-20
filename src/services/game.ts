import { db } from "../db/db";
import { rooms } from "../db/schema/rooms";
import { playlistItems } from "../db/schema/playlist";
import { guesses } from "../db/schema/guesses";
import { themeAttempts } from "../db/schema/theme";
import { eq, and, asc } from "drizzle-orm";

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
