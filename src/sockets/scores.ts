import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { getScoresService } from "../services/scores";

const scoresSchema = z.object({ roomCode: z.string().trim().min(4) });

export function registerScoreSockets(io: Server) {
	io.on("connection", (socket: Socket) => {
		socket.on("scores:get", async (payload, cb) => {
			try {
				const { roomCode } = scoresSchema.parse(payload ?? {});
				const scores = await getScoresService(roomCode);
				cb?.({ ok: true, scores });
			} catch (e: any) {
				cb?.({ ok: false, error: e?.message ?? "SCORES_GET_FAILED" });
			}
		});
	});
}
