import type { Server, Socket } from "socket.io";
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
import { registerPlaylistSockets } from "./playlist";
import { socketToMember } from "./presence";
import { roomMembers } from "../db";
import { eq } from "drizzle-orm";
import { db } from "../db/db";

export function registerSockets(io: Server) {
	io.on("connection", (socket: Socket) => {
		socket.on("disconnect", async () => {
			const ref = socketToMember.get(socket.id);
			socketToMember.delete(socket.id);
			if (!ref) return;
			try {
				await db.update(roomMembers).set({ isActive: false }).where(eq(roomMembers.id, ref.memberId));
				io.to(`room:${ref.roomCode}`).emit("member:presence", {
					memberId: ref.memberId,
					isActive: false,
				});
			} catch {}
		});
	});
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
	registerPlaylistSockets(io);
}
