// src/sockets/scores.ts
import type { Server, Socket } from "socket.io";
import { computeScores } from "../logic/scoring.js";
import { Ack, ackOk } from "../utils/ack.js";
import { requireRoom } from "../logic/guards.js";

export function register(io: Server, socket: Socket) {
	socket.on("score:compute", (ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		const sb = computeScores(room);
		io.to(room.code).emit("score:update", sb);
		ackOk(ack, { scoreboard: sb });
	});
}
