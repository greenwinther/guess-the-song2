// src/sockets/game.ts
import type { Server, Socket } from "socket.io";
import { toPublicRoomState } from "../logic/publicState";
import { Ack, ackOk } from "../utils/ack";
import { requireHost, requireRoom } from "../logic/guards";
import { GameSetIndexPayload, GameSetPhasePayload } from "./payloads";

export function register(io: Server, socket: Socket) {
	socket.on("game:setPhase", ({ phase }: GameSetPhasePayload, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		const me = requireHost(socket, room, ack);
		if (!me) return;
		room.phase = phase;
		io.to(room.code).emit("room:state", toPublicRoomState(room));
		ackOk(ack);
	});

	socket.on("game:setIndex", ({ index }: GameSetIndexPayload, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		const me = requireHost(socket, room, ack);
		if (!me) return;
		room.currentIndex = Math.max(0, Math.min(index, Math.max(0, room.submissions.length - 1)));
		io.to(room.code).emit("room:state", toPublicRoomState(room));
		ackOk(ack);
	});

	socket.on("reveal:add", ({ submissionId }: { submissionId: string }) => {
		const room = requireRoom(socket);
		if (!room) return;
		room.revealedSubmissionIds.add(submissionId);
		io.to(room.code).emit("reveal:update", [...room.revealedSubmissionIds]);
	});
}
