import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { revealSongService } from "../services/reveal";

const revealSchema = z.object({
	roomCode: z.string().trim().min(4),
	playlistItemId: z.number().int().positive(),
});

export function registerRevealSockets(io: Server) {
	io.on("connection", (socket: Socket) => {
		socket.on("reveal:nextSong", async (payload, cb) => {
			try {
				const data = revealSchema.parse(payload ?? {});
				const res = await revealSongService(data);

				io.to(`room:${data.roomCode}`).emit("reveal:result", res);
				cb?.({ ok: true, ...res });
			} catch (e: any) {
				cb?.({ ok: false, error: e?.message ?? "REVEAL_FAILED" });
			}
		});
	});
}
