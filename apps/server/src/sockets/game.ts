// src/sockets/game.ts
import type { Server, Socket } from "socket.io";
import { getRoom } from "../store/roomStore";
import { toPublicRoomState } from "../logic/publicState";
import { Ack, ackErr, ackOk } from "../utils/ack";

export function register(io: Server, socket: Socket) {
	socket.on(
		"game:setPhase",
		({ phase }: { phase: "LOBBY" | "GUESSING" | "RECAP" | "RESULTS" }, ack?: Ack) => {
			const room = getRoom(socket.data.roomCode!);
			const me = room?.members.get(socket.data.memberId!);
			if (!room || !me?.isHost) return ackErr(ack, "NOT_HOST");
			room.phase = phase;
			io.to(room.code).emit("room:state", toPublicRoomState(room));
			ackOk(ack);
		}
	);

	socket.on("game:setIndex", ({ index }: { index: number }, ack?: Ack) => {
		const room = getRoom(socket.data.roomCode!);
		const me = room?.members.get(socket.data.memberId!);
		if (!room || !me?.isHost) return ackErr(ack, "NOT_HOST");
		room.currentIndex = Math.max(0, Math.min(index, room.submissions.length - 1));
		io.to(room.code).emit("room:state", toPublicRoomState(room));
		ackOk(ack);
	});

	socket.on("reveal:add", ({ submissionId }: { submissionId: string }) => {
		const room = getRoom(socket.data.roomCode!);
		if (!room) return;
		room.revealedSubmissionIds.add(submissionId);
		io.to(room.code).emit("reveal:update", [...room.revealedSubmissionIds]);
	});
}
