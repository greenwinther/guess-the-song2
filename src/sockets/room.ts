import type { Server, Socket } from "socket.io";
import { createRoomSchema, joinRoomSchema } from "./validators";
import { createRoomService, joinRoomService } from "../services/room";

export function registerRoomSockets(io: Server) {
	io.on("connection", (socket: Socket) => {
		socket.on("room:create", async (payload, cb) => {
			try {
				const data = createRoomSchema.parse(payload ?? {});
				const room = await createRoomService(data);
				cb?.({ ok: true, room });
			} catch (err: any) {
				cb?.({ ok: false, error: err.message ?? "CREATE_FAILED" });
			}
		});

		socket.on("room:join", async (payload, cb) => {
			try {
				const data = joinRoomSchema.parse(payload ?? {});
				const { room, member } = await joinRoomService(data);
				// join socket.io room for broadcasts
				socket.join(`room:${room.code}`);
				cb?.({ ok: true, room, member });
				// notify others
				socket.to(`room:${room.code}`).emit("room:member-joined", { member });
			} catch (err: any) {
				cb?.({ ok: false, error: err.message ?? "JOIN_FAILED" });
			}
		});
	});
}
