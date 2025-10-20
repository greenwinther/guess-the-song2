import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { startGameService, nextSongService } from "../services/game";

const startSchema = z.object({ roomCode: z.string().trim().min(4) });
const nextSchema = z.object({ roomCode: z.string().trim().min(4) });

export function registerGameSockets(io: Server) {
	io.on("connection", (socket: Socket) => {
		socket.on("game:start", async (payload, cb) => {
			try {
				const { roomCode } = startSchema.parse(payload ?? {});
				const { roomId, currentIndex, playlistItemId } = await startGameService(roomCode);

				// broadcast phase/index change + thumbnail hint
				io.to(`room:${roomCode}`).emit("room:update", { phase: "GUESSING", currentIndex });
				io.to(`room:${roomCode}`).emit("playlist:started", { playlistItemId });

				cb?.({ ok: true, currentIndex, playlistItemId });
			} catch (e: any) {
				cb?.({ ok: false, error: e?.message ?? "GAME_START_FAILED" });
			}
		});

		socket.on("song:next", async (payload, cb) => {
			try {
				const { roomCode } = nextSchema.parse(payload ?? {});
				const res = await nextSongService(roomCode);

				if (res.phase === "RECAP") {
					io.to(`room:${roomCode}`).emit("room:update", {
						phase: "RECAP",
						currentIndex: res.currentIndex,
					});
				} else {
					io.to(`room:${roomCode}`).emit("room:update", { currentIndex: res.currentIndex });

					// ✅ Narrow before using it
					if ("nextPlaylistItemId" in res && res.nextPlaylistItemId != null) {
						io.to(`room:${roomCode}`).emit("playlist:started", {
							playlistItemId: res.nextPlaylistItemId,
						});
					}
				}

				cb?.({ ok: true, ...res });
			} catch (e: any) {
				cb?.({ ok: false, error: e?.message ?? "SONG_NEXT_FAILED" });
			}
		});
	});
}
