// src/sockets/player.ts
import type { Server, Socket } from "socket.io";
import { toPublicRoomState } from "../logic/publicState";
import { requireMember, requireRoom } from "../logic/guards";
import { Ack, ackOk } from "../utils/ack";
import type { PlayerRenamePayload, PlayerSetHardcorePayload } from "./payloads";

export function register(io: Server, socket: Socket) {
	socket.on("player:setHardcore", ({ hardcore }: PlayerSetHardcorePayload, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		const me = requireMember(socket, room, ack);
		if (!me) return;
		me.hardcore = !!hardcore;
		io.to(room.code).emit("room:state", toPublicRoomState(room));
		ackOk(ack);
	});

	socket.on("player:rename", ({ name }: PlayerRenamePayload, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		const me = requireMember(socket, room, ack);
		if (!me) return;
		if (name?.trim()) me.name = name.trim();
		io.to(room.code).emit("room:state", toPublicRoomState(room));
		ackOk(ack);
	});
}
