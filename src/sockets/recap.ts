import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { recapService } from "../services/recap";

const schema = z.object({ roomCode: z.string().trim().min(4) });

export function registerRecapSockets(io: Server) {
	io.on("connection", (socket: Socket) => {
		socket.on("reveal:recap", async (payload, cb) => {
			try {
				const { roomCode } = schema.parse(payload ?? {});
				const data = await recapService(roomCode);
				cb?.({ ok: true, ...data });
			} catch (e: any) {
				cb?.({ ok: false, error: e?.message ?? "RECAP_FAILED" });
			}
		});
	});
}
