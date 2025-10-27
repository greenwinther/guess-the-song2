// src/sockets/submissions.ts
import type { Server, Socket } from "socket.io";
import { Ack, ackOk } from "../utils/ack";
import { requireRoom } from "../logic/guards";
import type { SubmissionAddPayload, SubmissionRemovePayload } from "./payloads";

export function register(io: Server, socket: Socket) {
	socket.on("submission:add", (payload: SubmissionAddPayload, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		room.submissions.push(payload);
		io.to(room.code).emit("submission:list", room.submissions);
		ackOk(ack);
	});

	socket.on("submission:remove", ({ id }: SubmissionRemovePayload, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		room.submissions = room.submissions.filter((s) => s.id !== id);
		io.to(room.code).emit("submission:list", room.submissions);
		ackOk(ack);
	});
}
