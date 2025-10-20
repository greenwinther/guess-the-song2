import { db } from "../db/db";
import { rooms } from "../db/schema/rooms";
import { playlistItems } from "../db/schema/playlist";
import { submissions } from "../db/schema/submissions";
import { submitters } from "../db/schema/submitters";
import { guesses } from "../db/schema/guesses";
import { roomMembers } from "../db/schema/members";
import { eq, and, asc } from "drizzle-orm";

export async function recapService(roomCode: string) {
	const [room] = await db.select().from(rooms).where(eq(rooms.code, roomCode)).limit(1);
	if (!room) throw new Error("ROOM_NOT_FOUND");

	const items = await db
		.select({
			id: playlistItems.id,
			position: playlistItems.position,
			submissionId: playlistItems.submissionId,
			startedAt: playlistItems.startedAt,
			endedAt: playlistItems.endedAt,
		})
		.from(playlistItems)
		.where(eq(playlistItems.roomId, room.id))
		.orderBy(asc(playlistItems.position));

	// pull submissions/submitters
	const subIds = items.map((i) => i.submissionId);
	const subs = subIds.length
		? await db
				.select()
				.from(submissions)
				.where(and(eq(submissions.roomId, room.id)))
		: [];

	const subById = new Map(subs.map((s) => [s.id, s]));

	const submitterIds = Array.from(new Set(subs.map((s) => s.submitterId)));
	const submtrs = submitterIds.length
		? await db
				.select()
				.from(submitters)
				.where(and(eq(submitters.roomId, room.id)))
		: [];
	const submitterById = new Map(submtrs.map((s) => [s.id, s]));

	// fetch guesses with correctness
	const itemIds = items.map((i) => i.id);
	const guessRows = itemIds.length
		? await db
				.select({
					playlistItemId: guesses.playlistItemId,
					guesserId: guesses.guesserId,
					isCorrect: guesses.isCorrect,
					guessedSubmitterId: guesses.guessedSubmitterId,
					name: roomMembers.displayName,
				})
				.from(guesses)
				.leftJoin(roomMembers, eq(roomMembers.id, guesses.guesserId))
				.where(and(eq(guesses.roomId, room.id)))
		: [];

	const guessesByItem = new Map<number, typeof guessRows>();
	for (const g of guessRows) {
		const arr = guessesByItem.get(g.playlistItemId) ?? [];
		arr.push(g);
		guessesByItem.set(g.playlistItemId, arr);
	}

	return {
		room: { code: room.code, theme: room.theme, phase: room.phase, currentIndex: room.currentIndex },
		items: items.map((i) => {
			const sub = subById.get(i.submissionId)!;
			const corrSubmitter = submitterById.get(sub.submitterId);
			const g = guessesByItem.get(i.id) ?? [];
			const correct = g.filter((x) => x.isCorrect === true);
			const incorrect = g.filter((x) => x.isCorrect === false);
			return {
				playlistItemId: i.id,
				position: i.position,
				startedAt: i.startedAt,
				endedAt: i.endedAt,
				song: {
					submissionId: sub.id,
					title: sub.title,
					url: sub.url,
					thumbnailUrl: sub.thumbnailUrl,
					durationSeconds: sub.durationSeconds,
				},
				submitter: corrSubmitter ? { id: corrSubmitter.id, name: corrSubmitter.name } : null,
				stats: {
					correctCount: correct.length,
					incorrectCount: incorrect.length,
				},
				correctMembers: correct.map((c) => ({ memberId: c.guesserId, name: c.name })),
			};
		}),
	};
}
