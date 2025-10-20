import type { Server } from "socket.io";
import { registerRoomSockets } from "./room";
import { registerSubmissionSockets } from "./submission";
import { registerGameSockets } from "./game";
import { registerGuessSockets } from "./guess";
import { registerThemeSockets } from "./theme";
import { registerRevealSockets } from "./reveal";

export function registerSockets(io: Server) {
	registerRoomSockets(io);
	registerSubmissionSockets(io);
	registerGameSockets(io);
	registerGuessSockets(io);
	registerThemeSockets(io);
	registerRevealSockets(io);
}
