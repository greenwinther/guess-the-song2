import type { Server } from "socket.io";
import { registerRoomSockets } from "./room";
import { registerSubmissionSockets } from "./submission";
import { registerGameSockets } from "./game";
import { registerGuessSockets } from "./guess";
import { registerThemeSockets } from "./theme";
import { registerRevealSockets } from "./reveal";
import { registerScoreSockets } from "./scores";
import { registerResultsSockets } from "./results";
import { registerRoomSaveSockets } from "./roomSave";
import { registerRecapSockets } from "./recap";

export function registerSockets(io: Server) {
	registerRoomSockets(io);
	registerSubmissionSockets(io);
	registerGameSockets(io);
	registerGuessSockets(io);
	registerThemeSockets(io);
	registerRevealSockets(io);
	registerScoreSockets(io);
	registerResultsSockets(io);
	registerRoomSaveSockets(io);
	registerRecapSockets(io);
}
