// src/sockets/guesses.ts
import type { Server, Socket } from "socket.io";
import { Ack, ackErr, ackOk } from "../utils/ack.js";
import { allowGuessing, requireMember, requireRoom } from "../logic/guards.js";
import { GuessSubmitPayload } from "./payloads.js";

export function register(io: Server, socket: Socket) {
	socket.on("guess:submit", (guess: GuessSubmitPayload, ack: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		const me = requireMember(socket, room, ack);
		if (!me) return;

		if (!allowGuessing(room)) return ackErr(ack, "PHASE_LOCKED");

		const payload = {
			memberId: me.id,
			submissionId: guess.submissionId,
			guessedSubmitterName: guess.guessedSubmitterName,
			detailGuess: guess.detailGuess,
			at: Date.now(),
		};

		const idx = room.guesses.findIndex(
			(x) => x.memberId === me.id && x.submissionId === guess.submissionId
		);
		if (room.rules.maxOneGuessPerSong) {
			if (idx >= 0) room.guesses[idx] = payload;
			else room.guesses.push(payload);
		} else {
			room.guesses.push(payload);
		}
		return ackOk(ack);
	});
}
