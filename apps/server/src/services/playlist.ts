import { db } from "../db/db";
import { rooms } from "../db/schema/rooms";
import { playlistItems } from "../db/schema/playlist";
import { submissions } from "../db/schema/submissions";
import { submitters } from "../db/schema/submitters";
import { roomMembers } from "../db/schema/members";
import { eq, asc } from "drizzle-orm";

export async function getPlaylistService(roomCode: string) {
	const [room] = await db.select().from(rooms).where(eq(rooms.code, roomCode)).limit(1);
	if (!room) throw new Error("ROOM_NOT_FOUND");

	const items = await db
		.select({
			id: playlistItems.id,
			position: playlistItems.position,
			startedAt: playlistItems.startedAt,
			endedAt: playlistItems.endedAt,

			submissionId: submissions.id,
			title: submissions.title,
			url: submissions.url,
			thumbnailUrl: submissions.thumbnailUrl,
			durationSeconds: submissions.durationSeconds,

			submitterId: submitters.id,
			submitterName: submitters.name,
		})
		.from(playlistItems)
		.innerJoin(submissions, eq(submissions.id, playlistItems.submissionId))
		.innerJoin(submitters, eq(submitters.id, submissions.submitterId))
		.where(eq(playlistItems.roomId, room.id))
		.orderBy(asc(playlistItems.position));

	return { room, items };
}

export async function removePlaylistItemService(args: {
	roomCode: string;
	actorMemberId: number; // must be HOST
	playlistItemId: number;
}) {
	const [room] = await db.select().from(rooms).where(eq(rooms.code, args.roomCode)).limit(1);
	if (!room) throw new Error("ROOM_NOT_FOUND");

	const [actor] = await db
		.select()
		.from(roomMembers)
		.where(eq(roomMembers.id, args.actorMemberId))
		.limit(1);
	if (!actor || actor.roomId !== room.id) throw new Error("INVALID_MEMBER");
	if (actor.role !== "HOST") throw new Error("FORBIDDEN");

	return await db.transaction(async (tx) => {
		const [item] = await tx
			.select()
			.from(playlistItems)
			.where(eq(playlistItems.id, args.playlistItemId))
			.limit(1);
		if (!item || item.roomId !== room.id) throw new Error("ITEM_NOT_FOUND");

		// prevent removing past items if you want (optional):
		// if (item.position < (room.currentIndex ?? 0)) throw new Error("CANNOT_REMOVE_PAST");

		await tx.delete(playlistItems).where(eq(playlistItems.id, item.id));

		// re-pack positions contiguously: 0..N-1
		const rows = await tx
			.select({ id: playlistItems.id, position: playlistItems.position })
			.from(playlistItems)
			.where(eq(playlistItems.roomId, room.id))
			.orderBy(asc(playlistItems.position));

		// bulk update positions to index order
		for (let i = 0; i < rows.length; i++) {
			if (rows[i].position !== i) {
				await tx.update(playlistItems).set({ position: i }).where(eq(playlistItems.id, rows[i].id));
			}
		}

		return { removedId: item.id };
	});
}

export async function reorderPlaylistService(args: {
	roomCode: string;
	actorMemberId: number; // must be HOST
	orderedIds: number[]; // full ordered list of playlistItem ids
}) {
	const [room] = await db.select().from(rooms).where(eq(rooms.code, args.roomCode)).limit(1);
	if (!room) throw new Error("ROOM_NOT_FOUND");

	const [actor] = await db
		.select()
		.from(roomMembers)
		.where(eq(roomMembers.id, args.actorMemberId))
		.limit(1);
	if (!actor || actor.roomId !== room.id) throw new Error("INVALID_MEMBER");
	if (actor.role !== "HOST") throw new Error("FORBIDDEN");

	return await db.transaction(async (tx) => {
		const rows = await tx
			.select({ id: playlistItems.id })
			.from(playlistItems)
			.where(eq(playlistItems.roomId, room.id))
			.orderBy(asc(playlistItems.position));

		const currentIds = rows.map((r) => r.id);
		if (currentIds.length !== args.orderedIds.length) throw new Error("ORDER_LENGTH_MISMATCH");

		// ensure same set
		const setA = new Set(currentIds);
		const setB = new Set(args.orderedIds);
		if (setA.size !== setB.size || [...setA].some((id) => !setB.has(id))) {
			throw new Error("ORDER_IDS_MISMATCH");
		}

		// optional: forbid moving items that are already past currentIndex (hard rule)
		// (requires looking up each item's position first, skipped for brevity)

		// update positions to match new order
		for (let i = 0; i < args.orderedIds.length; i++) {
			await tx
				.update(playlistItems)
				.set({ position: i })
				.where(eq(playlistItems.id, args.orderedIds[i]));
		}
		return { count: args.orderedIds.length };
	});
}
