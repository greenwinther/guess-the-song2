// src/sockets/submissions.ts
import type { Server, Socket } from "socket.io";
import { Ack, ackErr, ackOk } from "../utils/ack.js";
import { requireHost, requireRoom } from "../logic/guards.js";
import type { SubmissionAddPayload, SubmissionRemovePayload } from "./payloads.js";
import { shortId } from "../utils/ids.js";

export function register(io: Server, socket: Socket) {
	socket.on("submission:add", (payload: SubmissionAddPayload, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		const me = requireHost(socket, room, ack);
		if (!me) return;

		// require unique submitter names (since 1 person = 1 song)
		if (
			room.submissions.some(
				(s) => s.submitterName.trim().toLowerCase() === payload.submitterName.trim().toLowerCase()
			)
		) {
			return ackErr(ack, "DUP_SUBMITTER");
		}

		room.submissions.push({
			id: payload.id,
			title: payload.title,
			videoId: payload.videoId,
			submitterName: payload.submitterName,
			detailHint: payload.detailHint,
			detail: payload.detail,
		});
		io.to(room.code).emit(
			"submission:list",
			room.submissions.map((s) => ({
				id: s.id,
				title: s.title,
				detailHint: s.detailHint ?? undefined,
			}))
		);
		return ackOk(ack, { id: payload.id });
	});

	socket.on("submission:remove", ({ id }: SubmissionRemovePayload, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		room.submissions = room.submissions.filter((s: any) => s.id !== id);
		io.to(room.code).emit("submission:list", room.submissions);
		ackOk(ack);
	});
}
