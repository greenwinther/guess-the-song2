import type { Server, Socket } from "socket.io";
import { z } from "zod";
import {
	upsertGuessService,
	lockGuessService,
	lockAllGuessesForMember,
	lockAllGuessesForRoom,
} from "../services/guess";

const upsertSchema = z.object({
	roomCode: z.string().trim().min(4),
	playlistItemId: z.number().int().positive(),
	guesserId: z.number().int().positive(),
	guessedSubmitterId: z.number().int().positive(),
});

const lockSchema = z.object({
	roomCode: z.string().trim().min(4),
	playlistItemId: z.number().int().positive(),
	guesserId: z.number().int().positive(),
});

const submitAllSchema = z.object({
	roomCode: z.string().trim().min(4),
	memberId: z.number().int().positive(), // the caller’s memberId
});
const hostLockAllSchema = z.object({
	roomCode: z.string().trim().min(4),
});

export function registerGuessSockets(io: Server) {
	io.on("connection", (socket: Socket) => {
		socket.on("guess:upsert", async (payload, cb) => {
			try {
				const data = upsertSchema.parse(payload ?? {});
				const { guess } = await upsertGuessService(data);

				// You might NOT want to broadcast guessedSubmitterId to everyone (privacy).
				// Instead, you can ack only to the caller, or emit a minimal event:
				socket.emit("guess:updated", {
					playlistItemId: guess.playlistItemId,
					guesserId: guess.guesserId,
				});

				cb?.({ ok: true, guess });
			} catch (e: any) {
				const code = e?.message ?? "GUESS_UPSERT_FAILED";
				cb?.({ ok: false, error: code });
			}
		});

		socket.on("guess:lock", async (payload, cb) => {
			try {
				const data = lockSchema.parse(payload ?? {});
				const { guess } = await lockGuessService(data);

				io.to(`room:${data.roomCode}`).emit("guess:locked", {
					playlistItemId: guess.playlistItemId,
					guesserId: guess.guesserId,
					lockedAt: guess.lockedAt,
				});

				cb?.({ ok: true, guess });
			} catch (e: any) {
				const code = e?.message ?? "GUESS_LOCK_FAILED";
				cb?.({ ok: false, error: code });
			}
		});

		socket.on("guess:submitAll", async (payload, cb) => {
			try {
				const { roomCode, memberId } = submitAllSchema.parse(payload ?? {});
				const res = await lockAllGuessesForMember({ roomCode, memberId });
				io.to(`room:${roomCode}`).emit("guess:bulk-locked", { memberId, scope: "self" });
				cb?.({ ok: true, ...res });
			} catch (e: any) {
				cb?.({ ok: false, error: e?.message ?? "GUESS_SUBMIT_ALL_FAILED" });
			}
		});

		socket.on("guess:lockAllForRoom", async (payload, cb) => {
			try {
				const { roomCode } = hostLockAllSchema.parse(payload ?? {});
				const res = await lockAllGuessesForRoom({ roomCode });
				io.to(`room:${roomCode}`).emit("guess:bulk-locked", { scope: "room" });
				cb?.({ ok: true, ...res });
			} catch (e: any) {
				cb?.({ ok: false, error: e?.message ?? "GUESS_LOCK_ALL_ROOM_FAILED" });
			}
		});
	});
}
