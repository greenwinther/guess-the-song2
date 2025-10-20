import { db } from "../db/db";
import { rooms } from "../db/schema/rooms";
import { guesses } from "../db/schema/guesses";
import { playlistItems } from "../db/schema/playlist";
import { submissions } from "../db/schema/submissions";
import { submitters } from "../db/schema/submitters";
import { roomMembers } from "../db/schema/members";
import { eq, and } from "drizzle-orm";

export async function getSongResultsService(args: { roomCode: string; playlistItemId: number }) {
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
	const [correctSubmtr] = await db
		.select()
		.from(submitters)
		.where(eq(submitters.id, sub.submitterId))
		.limit(1);

	// guesses with correctness snapshot (set on reveal)
	const rows = await db
		.select({
			guesserId: guesses.guesserId,
			isCorrect: guesses.isCorrect,
			guessedSubmitterId: guesses.guessedSubmitterId,
			memberName: roomMembers.displayName,
		})
		.from(guesses)
		.leftJoin(roomMembers, eq(roomMembers.id, guesses.guesserId))
		.where(and(eq(guesses.roomId, room.id), eq(guesses.playlistItemId, pli.id)));

	const correct = rows.filter((r) => r.isCorrect === true);
	const incorrect = rows.filter((r) => r.isCorrect === false);

	return {
		playlistItemId: pli.id,
		correctSubmitterId: sub.submitterId,
		correctSubmitterName: correctSubmtr?.name ?? null,
		correctCount: correct.length,
		correctMembers: correct.map((r) => ({ memberId: r.guesserId, name: r.memberName })),
		incorrect: incorrect.map((r) => ({
			memberId: r.guesserId,
			name: r.memberName,
			guessedSubmitterId: r.guessedSubmitterId,
		})),
	};
}
