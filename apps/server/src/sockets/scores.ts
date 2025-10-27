// src/sockets/scores.ts
import type { Server, Socket } from "socket.io";
import { getRoom } from "../store/roomStore";
import { computeScores } from "../logic/scoring";
import { Ack, ackErr, ackOk } from "../utils/ack";

export function register(io: Server, socket: Socket) {
	socket.on("score:compute", (ack?: Ack) => {
		const room = getRoom(socket.data.roomCode!);
		if (!room) return ackErr(ack, "NO_ROOM");
		const sb = computeScores(room);
		io.to(room.code).emit("score:update", sb);
		ackOk(ack, { ok: true, scoreboard: sb });
	});
}
