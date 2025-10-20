import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { saveRoomService } from "../services/roomSave";

const schema = z.object({ roomCode: z.string().trim().min(4) });

export function registerRoomSaveSockets(io: Server) {
	io.on("connection", (socket: Socket) => {
		socket.on("room:save", async (payload, cb) => {
			try {
				const { roomCode } = schema.parse(payload ?? {});
				const room = await saveRoomService(roomCode);
				io.to(`room:${roomCode}`).emit("room:saved", {
					isSaved: room.isSaved,
					savedAt: room.savedAt,
					expiresAt: room.expiresAt,
				});
				cb?.({ ok: true, room });
			} catch (e: any) {
				cb?.({ ok: false, error: e?.message ?? "ROOM_SAVE_FAILED" });
			}
		});
	});
}
