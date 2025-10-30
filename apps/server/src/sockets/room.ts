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
} from "../store/roomStore.js";
import { toPublicRoomState } from "../logic/publicState.js";
import { Ack, ackErr, ackOk } from "../utils/ack.js";
import { requireHost, requireRoom } from "../logic/guards.js";
import type { RoomCreatePayload, RoomJoinPayload, HostAssignPayload } from "./payloads.js";

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

	socket.on("control:assign", ({ targetId }: { targetId: string }, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		const me = requireHost(socket, room, ack);
		if (!me) return;
		if (!room.members.has(targetId)) return ackErr(ack, "NO_SUCH_MEMBER");
		room.controllerId = targetId;
		io.to(room.code).emit("room:state", toPublicRoomState(room));
		ackOk(ack, { controllerId: targetId });
	});

	// optional: let someone claim controller with the hostKey
	socket.on("control:claim", ({ hostKey }: { hostKey: string }, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		const meId = socket.data.memberId!;
		if (hostKey !== room.hostKey) return ackErr(ack, "BAD_KEY");
		if (!room.members.has(meId)) return ackErr(ack, "NOT_MEMBER");
		room.controllerId = meId;
		io.to(room.code).emit("room:state", toPublicRoomState(room));
		ackOk(ack, { controllerId: meId });
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
