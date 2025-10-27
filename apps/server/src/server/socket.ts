// src/server/socket.ts
import type { Server, Socket } from "socket.io";
import * as roomHandlers from "../sockets/room";
import * as playerHandlers from "../sockets/player";
import * as submissionsHandlers from "../sockets/submissions";
import * as gameHandlers from "../sockets/game";
import * as guessesHandlers from "../sockets/guesses";
import * as themeHandlers from "../sockets/theme";
import * as scoresHandlers from "../sockets/scores";

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
