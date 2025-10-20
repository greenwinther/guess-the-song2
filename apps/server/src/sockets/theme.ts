import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { upsertThemeAttemptService, lockThemeAttemptService } from "../services/theme";
import { getScoresService } from "../services/scores";

const upsertSchema = z.object({
	roomCode: z.string().trim().min(4),
	playlistItemId: z.number().int().positive(),
	guesserId: z.number().int().positive(),
	text: z.string().trim().min(1).max(200),
});

const lockSchema = z.object({
	roomCode: z.string().trim().min(4),
	playlistItemId: z.number().int().positive(),
	guesserId: z.number().int().positive(),
});

export function registerThemeSockets(io: Server) {
	io.on("connection", (socket: Socket) => {
		socket.on("themeAttempt:upsert", async (payload, cb) => {
			try {
				const data = upsertSchema.parse(payload ?? {});
				const { attempt } = await upsertThemeAttemptService(data);
				// Only notify the caller (others don’t need to see the text)
				socket.emit("themeAttempt:updated", {
					playlistItemId: attempt.playlistItemId,
					guesserId: attempt.guesserId,
				});
				cb?.({ ok: true, attempt });
			} catch (e: any) {
				cb?.({ ok: false, error: e?.message ?? "THEME_UPSERT_FAILED" });
			}
		});

		socket.on("themeAttempt:lock", async (payload, cb) => {
			try {
				const data = lockSchema.parse(payload ?? {});
				const { attempt } = await lockThemeAttemptService(data);
				io.to(`room:${data.roomCode}`).emit("themeAttempt:locked", {
					playlistItemId: attempt.playlistItemId,
					guesserId: attempt.guesserId,
					lockedAt: attempt.lockedAt,
				});

				// If that lock solved the theme & awarded points, refresh leaderboard
				if (attempt.isCorrect) {
					const scores = await getScoresService(data.roomCode);
					io.to(`room:${data.roomCode}`).emit("scores:updated", { scores });
				}

				cb?.({ ok: true, attempt });
			} catch (e: any) {
				cb?.({ ok: false, error: e?.message ?? "THEME_LOCK_FAILED" });
			}
		});
	});
}
