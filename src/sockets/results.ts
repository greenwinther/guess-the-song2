import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { getSongResultsService } from "../services/results";

const songResultsSchema = z.object({
	roomCode: z.string().trim().min(4),
	playlistItemId: z.number().int().positive(),
});

export function registerResultsSockets(io: Server) {
	io.on("connection", (socket: Socket) => {
		socket.on("results:song", async (payload, cb) => {
			try {
				const data = songResultsSchema.parse(payload ?? {});
				const res = await getSongResultsService(data);
				cb?.({ ok: true, ...res });
			} catch (e: any) {
				cb?.({ ok: false, error: e?.message ?? "RESULTS_SONG_FAILED" });
			}
		});
	});
}
