import type { Server, Socket } from "socket.io";
import { createRoomSchema, joinRoomSchema } from "./validators";
import { createRoomService, joinRoomService } from "../services/room";
import { socketToMember } from "./presence";
import { roomMembers } from "../db";
import { db } from "../db/db";
import { eq } from "drizzle-orm";

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
				socketToMember.set(socket.id, { roomCode: room.code, memberId: member.id });
				cb?.({ ok: true, room, member });
				// notify others
				socket.to(`room:${room.code}`).emit("room:member-joined", { member });
				await db.update(roomMembers).set({ isActive: true }).where(eq(roomMembers.id, member.id));
				io.to(`room:${room.code}`).emit("member:presence", { memberId: member.id, isActive: true });
			} catch (err: any) {
				cb?.({ ok: false, error: err.message ?? "JOIN_FAILED" });
			}
		});
	});
}
