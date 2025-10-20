// services/submission.ts
import { db } from "../db/db";
import { rooms } from "../db/schema/rooms";
import { submitters } from "../db/schema/submitters";
import { submissions } from "../db/schema/submissions";
import { playlistItems } from "../db/schema/playlist";
import { eq, and, count } from "drizzle-orm";
import { isoDurationToSeconds } from "../utils/duration";

const MAX_PLAYLIST = 20;

export async function addSubmissionService(args: {
	roomCode: string;
	submitterName: string;
	url: string;
	title?: string;
	thumbnailUrl?: string;
	provider?: string;
	externalId?: string;
	addedByMemberId?: number | null;
	durationIso?: string;
	durationSeconds?: number;
}) {
	// Resolve room (outside tx is fine)
	const [room] = await db.select().from(rooms).where(eq(rooms.code, args.roomCode)).limit(1);
	if (!room) throw new Error("ROOM_NOT_FOUND");

	const durationSeconds =
		args.durationSeconds ??
		(args.provider === "youtube" ? isoDurationToSeconds(args.durationIso ?? "") : null);

	return await db.transaction(async (tx) => {
		// Upsert submitter per-room (unique by (roomId, name))
		let submitterId: number;
		const [existingSubmitter] = await tx
			.select()
			.from(submitters)
			.where(and(eq(submitters.roomId, room.id), eq(submitters.name, args.submitterName)))
			.limit(1);

		if (existingSubmitter) {
			submitterId = existingSubmitter.id;
		} else {
			const [ins] = await tx
				.insert(submitters)
				.values({ roomId: room.id, name: args.submitterName })
				.returning();
			submitterId = ins.id;
		}

		// Count current playlist length (race-safe inside the tx)
		const [{ cnt }] = await tx
			.select({ cnt: count() })
			.from(playlistItems)
			.where(eq(playlistItems.roomId, room.id));

		if (cnt >= MAX_PLAYLIST) {
			throw new Error("PLAYLIST_FULL");
		}

		// Create submission
		const [sub] = await tx
			.insert(submissions)
			.values({
				roomId: room.id,
				submitterId,
				url: args.url,
				title: args.title,
				thumbnailUrl: args.thumbnailUrl,
				provider: args.provider,
				externalId: args.externalId,
				addedByMemberId: args.addedByMemberId ?? null,
				durationSeconds: durationSeconds ?? null,
			})
			.returning();

		// Next position = current count (positions 0..N-1)
		const nextPos = Number(cnt);

		// Append to playlist (your unique indexes (roomId, position) & (roomId, submissionId) will protect against races)
		const [pli] = await tx
			.insert(playlistItems)
			.values({
				roomId: room.id,
				submissionId: sub.id,
				position: nextPos,
			})
			.returning();

		return { room, submitterId, submission: sub, playlistItem: pli };
	});
}
