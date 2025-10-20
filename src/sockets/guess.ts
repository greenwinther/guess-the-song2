import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { upsertGuessService, lockGuessService } from "../services/guess";

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
	});
}
