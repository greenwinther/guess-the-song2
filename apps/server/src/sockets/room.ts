// src/sockets/room.ts
import type { Server, Socket } from "socket.io";
import {
	createRoom,
	getRoom,
	joinRoom,
	markDisconnected,
	assignHost,
	markSaved,
	markUnsaved,
} from "../store/roomStore";
import { toPublicRoomState } from "../logic/publicState";
import { Ack, ackErr, ackOk } from "../utils/ack";
import { requireHost, requireRoom } from "../logic/guards";
import type { RoomCreatePayload, RoomJoinPayload, HostAssignPayload } from "./payloads";

export function register(io: Server, socket: Socket) {
	socket.on("room:create", ({ code }: RoomCreatePayload, ack?: Ack) => {
		if (getRoom(code)) return ackErr(ack, "ROOM_EXISTS");
		const room = createRoom(code);
		return ackOk(ack, { room: toPublicRoomState(room) });
	});

	socket.on("room:join", ({ code, name, memberId }: RoomJoinPayload, ack?: Ack) => {
		const { room, member } = joinRoom(code, name, memberId);
		socket.join(code);
		socket.data.roomCode = code;
		socket.data.memberId = member.id;

		io.to(code).emit("room:state", toPublicRoomState(room));
		return ackOk(ack, { memberId: member.id, room: toPublicRoomState(room) });
	});

	socket.on("host:assign", ({ targetId }: HostAssignPayload, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		const me = requireHost(socket, room, ack);
		if (!me) return;

		const ok = assignHost(room.code, me.id, targetId);
		if (!ok) return ackErr(ack, "ASSIGN_FAILED");

		io.to(room.code).emit("room:state", toPublicRoomState(getRoom(room.code)!));
		return ackOk(ack, { assignedTo: targetId });
	});

	socket.on("disconnect", () => {
		const code = socket.data.roomCode;
		const me = socket.data.memberId;
		if (!code || !me) return;
		markDisconnected(code, me);
		const room = getRoom(code);
		if (room) io.to(code).emit("room:state", toPublicRoomState(room));
	});

	socket.on("room:save", (_: {}, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		markSaved(room.code);
		io.to(room.code).emit("room:state", toPublicRoomState(getRoom(room.code)!));
		ackOk(ack, { saved: true, expiresAt: getRoom(room.code)!.expiresAt });
	});

	socket.on("room:unsave", (_: {}, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		markUnsaved(room.code);
		io.to(room.code).emit("room:state", toPublicRoomState(getRoom(room.code)!));
		ackOk(ack, { saved: false, expiresAt: getRoom(room.code)!.expiresAt });
	});
}
