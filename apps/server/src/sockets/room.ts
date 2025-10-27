// src/sockets/room.ts
import type { Server, Socket } from "socket.io";
import { createRoom, getRoom, joinRoom, markDisconnected, assignHost } from "../store/roomStore";
import { toPublicRoomState } from "../logic/publicState";
import { Ack, ackOk } from "../utils/ack";

export function register(io: Server, socket: Socket) {
	socket.on("room:create", ({ code }: { code: string }, ack?: Ack) => {
		const room = createRoom(code);
		ackOk(ack, { ok: true, room: toPublicRoomState(room) });
	});

	socket.on(
		"room:join",
		({ code, name, memberId }: { code: string; name: string; memberId?: string }, ack?: Ack) => {
			const { room, member } = joinRoom(code, name, memberId);
			socket.join(code);
			socket.data.roomCode = code;
			socket.data.memberId = member.id;

			io.to(code).emit("room:state", toPublicRoomState(room));
			ackOk(ack, { ok: true, memberId: member.id, room: toPublicRoomState(room) });
		}
	);

	socket.on("host:assign", ({ targetId }: { targetId: string }, ack?: Ack) => {
		const code = socket.data.roomCode,
			me = socket.data.memberId;
		const ok = code && me ? assignHost(code, me, targetId) : false;
		if (ok) io.to(code!).emit("room:state", toPublicRoomState(getRoom(code!)!));
		ackOk(ack, { ok });
	});

	socket.on("disconnect", () => {
		const code = socket.data.roomCode,
			me = socket.data.memberId;
		if (!code || !me) return;
		markDisconnected(code, me);
		const room = getRoom(code);
		if (room) io.to(code).emit("room:state", toPublicRoomState(room));
	});
}
