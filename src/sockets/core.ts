import type { Server } from "socket.io";
import { registerRoomSockets } from "./room";
import { registerSubmissionSockets } from "./submission";
import { registerGameSockets } from "./game";

export function registerSockets(io: Server) {
	registerRoomSockets(io);
	registerSubmissionSockets(io);
	registerGameSockets(io);
}
