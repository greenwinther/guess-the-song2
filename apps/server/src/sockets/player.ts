// src/sockets/player.ts
import type { Server, Socket } from "socket.io";
import { getRoom } from "../store/roomStore";
import { toPublicRoomState } from "../logic/publicState";

export function register(io: Server, socket: Socket) {
	socket.on("player:setHardcore", ({ hardcore }: { hardcore: boolean }) => {
		const room = getRoom(socket.data.roomCode!);
		if (!room) return;
		const m = room.members.get(socket.data.memberId!);
		if (!m) return;
		m.hardcore = !!hardcore;
		io.to(room.code).emit("room:state", toPublicRoomState(room));
	});

	socket.on("player:rename", ({ name }: { name: string }) => {
		const room = getRoom(socket.data.roomCode!);
		if (!room) return;
		const m = room.members.get(socket.data.memberId!);
		if (!m) return;
		if (name?.trim()) m.name = name.trim();
		io.to(room.code).emit("room:state", toPublicRoomState(room));
	});
}
