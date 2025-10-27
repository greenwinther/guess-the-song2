// src/server/socket.ts
import type { Server, Socket } from "socket.io";
import * as roomHandlers from "../sockets/room.js";
import * as playerHandlers from "../sockets/player.js";
import * as submissionsHandlers from "../sockets/submissions.js";
import * as gameHandlers from "../sockets/game.js";
import * as guessesHandlers from "../sockets/guesses.js";
import * as themeHandlers from "../sockets/theme.js";
import * as scoresHandlers from "../sockets/scores.js";

export function registerSocketHandlers(io: Server) {
	io.on("connection", (socket: Socket) => {
		// Attach per-socket context (we’ll keep roomCode/memberId here)
		socket.data.roomCode = undefined as string | undefined;
		socket.data.memberId = undefined as string | undefined;

		roomHandlers.register(io, socket);
		playerHandlers.register(io, socket);
		submissionsHandlers.register(io, socket);
		gameHandlers.register(io, socket);
		guessesHandlers.register(io, socket);
		themeHandlers.register(io, socket);
		scoresHandlers.register(io, socket);
	});
}
