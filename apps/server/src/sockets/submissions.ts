// src/sockets/submissions.ts
import type { Server, Socket } from "socket.io";
import { Ack, ackOk } from "../utils/ack.js";
import { requireRoom } from "../logic/guards.js";
import type { SubmissionAddPayload, SubmissionRemovePayload } from "./payloads.js";

export function register(io: Server, socket: Socket) {
	socket.on("submission:add", (payload: SubmissionAddPayload, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		room.submissions.push(payload);
		io.to(room.code).emit(
			"submission:list",
			room.submissions.map((s) => ({
				id: s.id,
				title: s.title,
				submitterName: s.submitterName,
				detailHint: s.detailHint ?? undefined,
			}))
		);
		ackOk(ack);
	});

	socket.on("submission:remove", ({ id }: SubmissionRemovePayload, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		room.submissions = room.submissions.filter((s: any) => s.id !== id);
		io.to(room.code).emit("submission:list", room.submissions);
		ackOk(ack);
	});
}
