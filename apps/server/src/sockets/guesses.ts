// src/sockets/guesses.ts
import type { Server, Socket } from "socket.io";
import { Ack, ackErr, ackOk } from "../utils/ack";
import { allowGuessing, requireMember, requireRoom } from "../logic/guard";

export function register(io: Server, socket: Socket) {
	socket.on(
		"guess:submit",
		(guess: { memberId: string; submissionId: string; guessedSubmitterId: string }, ack: Ack) => {
			const room = requireRoom(socket, ack);
			if (!room) return;
			const me = requireMember(socket, room, ack);
			if (!me) return;

			if (!allowGuessing(room)) return ackErr(ack, "PHASE_LOCKED");

			const idx = room.guesses.findIndex(
				(x) => x.memberId === guess.memberId && x.submissionId === guess.submissionId
			);
			if (room.rules.maxOneGuessPerSong) {
				if (idx >= 0) room.guesses[idx] = { ...guess, at: Date.now() };
				else room.guesses.push({ ...guess, at: Date.now() });
			} else {
				room.guesses.push({ ...guess, at: Date.now() });
			}
			return ackOk(ack);
		}
	);
}
