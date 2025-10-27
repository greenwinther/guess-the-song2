// src/sockets/submissions.ts
import type { Server, Socket } from "socket.io";
import { getRoom } from "../store/roomStore";
import { Ack, ackErr, ackOk } from "../utils/ack";

export function register(io: Server, socket: Socket) {
	socket.on("submission:add", (payload, ack?: Ack) => {
		const room = getRoom(socket.data.roomCode!);
		if (!room) return ackErr(ack, "NO_ROOM");
		room.submissions.push(payload);
		io.to(room.code).emit("submission:list", room.submissions);
		ackOk(ack, { ok: true });
	});

	socket.on("submission:remove", ({ id }: { id: string }, ack?: Ack) => {
		const room = getRoom(socket.data.roomCode!);
		if (!room) return ackErr(ack, "NO_ROOM");
		room.submissions = room.submissions.filter((s) => s.id !== id);
		io.to(room.code).emit("submission:list", room.submissions);
		ackOk(ack, { ok: true });
	});
}
