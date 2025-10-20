import { db } from "../db/db";
import { rooms } from "../db/schema/rooms";
import { playlistItems } from "../db/schema/playlist";
import { submissions } from "../db/schema/submissions";
import { guesses } from "../db/schema/guesses";
import { memberScores } from "../db/schema/scores";
import { eq, and } from "drizzle-orm";

const GUESS_POINTS = 1; // tweak as you like

export async function revealSongService(args: { roomCode: string; playlistItemId: number }) {
	const [room] = await db.select().from(rooms).where(eq(rooms.code, args.roomCode)).limit(1);
	if (!room) throw new Error("ROOM_NOT_FOUND");

	const [pli] = await db
		.select()
		.from(playlistItems)
		.where(eq(playlistItems.id, args.playlistItemId))
		.limit(1);
	if (!pli || pli.roomId !== room.id) throw new Error("INVALID_PLAYLIST_ITEM");

	const [sub] = await db.select().from(submissions).where(eq(submissions.id, pli.submissionId)).limit(1);
	if (!sub) throw new Error("SUBMISSION_NOT_FOUND");

	// Correct submitter for this song
	const correctId = sub.submitterId;

	return await db.transaction(async (tx) => {
		// 1) mark correctness on all guesses for this item
		const itemGuesses = await tx
			.select()
			.from(guesses)
			.where(and(eq(guesses.roomId, room.id), eq(guesses.playlistItemId, pli.id)));

		const correctMemberIds: number[] = [];

		for (const g of itemGuesses) {
			const isCorrect = g.guessedSubmitterId === correctId;
			if (g.isCorrect === isCorrect) continue; // already set or stable
			await tx.update(guesses).set({ isCorrect }).where(eq(guesses.id, g.id)).returning();
			if (isCorrect) correctMemberIds.push(g.guesserId);
		}

		// 2) award points to correct members (idempotent-ish by only adding for newly correct)
		//    For simplicity here: add for everyone marked correct (you can track scoredAt if you want strict idempotency)
		for (const memberId of correctMemberIds) {
			// upsert memberScores
			const existing = await tx
				.select()
				.from(memberScores)
				.where(and(eq(memberScores.roomId, room.id), eq(memberScores.memberId, memberId)))
				.limit(1);

			if (existing[0]) {
				await tx
					.update(memberScores)
					.set({
						guessPoints: existing[0].guessPoints + GUESS_POINTS,
						totalPoints: existing[0].totalPoints + GUESS_POINTS,
					})
					.where(eq(memberScores.id, existing[0].id));
			} else {
				await tx.insert(memberScores).values({
					roomId: room.id,
					memberId,
					guessPoints: GUESS_POINTS,
					themePoints: 0,
					totalPoints: GUESS_POINTS,
				});
			}
		}

		// 3) return a compact results payload
		return {
			playlistItemId: pli.id,
			correctSubmitterId: correctId,
			correctCount: correctMemberIds.length,
			correctMemberIds,
		};
	});
}
