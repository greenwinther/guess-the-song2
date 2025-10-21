import { db } from "../db/db";
import { rooms } from "../db/schema/rooms";
import { playlistItems } from "../db/schema/playlist";
import { roomMembers } from "../db/schema/members";
import { guesses } from "../db/schema/guesses";
import { submitters } from "../db/schema/submitters";
import { eq, and, inArray, isNull } from "drizzle-orm";

function assertPhase(phase?: string) {
	if (phase !== "GUESSING" && phase !== "RECAP") {
		throw new Error("PHASE_FORBIDS_GUESSING");
	}
}

export async function upsertGuessService(args: {
	roomCode: string;
	playlistItemId: number;
	guesserId: number;
	guessedSubmitterId: number;
}) {
	const [room] = await db.select().from(rooms).where(eq(rooms.code, args.roomCode)).limit(1);
	if (!room) throw new Error("ROOM_NOT_FOUND");
	assertPhase(room.phase);

	// Validate playlist item belongs to this room (and read its position)
	const [pli] = await db
		.select()
		.from(playlistItems)
		.where(eq(playlistItems.id, args.playlistItemId))
		.limit(1);
	if (!pli || pli.roomId !== room.id) throw new Error("INVALID_PLAYLIST_ITEM");

	// Validate member belongs to this room
	const [member] = await db.select().from(roomMembers).where(eq(roomMembers.id, args.guesserId)).limit(1);
	if (!member || member.roomId !== room.id) throw new Error("INVALID_MEMBER");

	// Validate submitter belongs to this room
	const [subm] = await db
		.select()
		.from(submitters)
		.where(eq(submitters.id, args.guessedSubmitterId))
		.limit(1);
	if (!subm || subm.roomId !== room.id) throw new Error("INVALID_SUBMITTER");

	// Hardcore cannot change guesses for past songs (position < currentIndex)
	if (member.hardcore && pli.position < room.currentIndex) {
		throw new Error("HARDCORE_LOCKED_PREVIOUS");
	}

	return await db.transaction(async (tx) => {
		// Check existing guess
		const [existing] = await tx
			.select()
			.from(guesses)
			.where(
				and(
					eq(guesses.roomId, room.id),
					eq(guesses.playlistItemId, pli.id),
					eq(guesses.guesserId, member.id)
				)
			)
			.limit(1);

		if (existing?.lockedAt) {
			throw new Error("GUESS_LOCKED");
		}

		if (existing) {
			const [updated] = await tx
				.update(guesses)
				.set({ guessedSubmitterId: args.guessedSubmitterId })
				.where(eq(guesses.id, existing.id))
				.returning();
			return { guess: updated };
		} else {
			const [created] = await tx
				.insert(guesses)
				.values({
					roomId: room.id,
					playlistItemId: pli.id,
					guesserId: member.id,
					guessedSubmitterId: args.guessedSubmitterId,
				})
				.returning();
			return { guess: created };
		}
	});
}

export async function lockGuessService(args: {
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

	const [existing] = await db
		.select()
		.from(guesses)
		.where(
			and(
				eq(guesses.roomId, room.id),
				eq(guesses.playlistItemId, pli.id),
				eq(guesses.guesserId, member.id)
			)
		)
		.limit(1);

	if (!existing) {
		// If they never made a choice, you can either reject or lock a "missing" guess.
		// Here: reject so the client prompts them to pick first.
		throw new Error("NO_GUESS_TO_LOCK");
	}
	if (existing.lockedAt) return { guess: existing }; // idempotent

	const [locked] = await db
		.update(guesses)
		.set({ lockedAt: now })
		.where(eq(guesses.id, existing.id))
		.returning();

	return { guess: locked };
}

export async function lockAllGuessesForMember(args: { roomCode: string; memberId: number }) {
	const [room] = await db.select().from(rooms).where(eq(rooms.code, args.roomCode)).limit(1);
	if (!room) throw new Error("ROOM_NOT_FOUND");

	const now = new Date();
	await db
		.update(guesses)
		.set({ lockedAt: now })
		.where(
			and(eq(guesses.roomId, room.id), eq(guesses.guesserId, args.memberId), isNull(guesses.lockedAt))
		);

	return { lockedAt: now };
}

export async function lockAllGuessesForRoom(args: { roomCode: string }) {
	const [room] = await db.select().from(rooms).where(eq(rooms.code, args.roomCode)).limit(1);
	if (!room) throw new Error("ROOM_NOT_FOUND");
	const now = new Date();
	await db
		.update(guesses)
		.set({ lockedAt: now })
		.where(and(eq(guesses.roomId, room.id), isNull(guesses.lockedAt)));
	return { lockedAt: now };
}
