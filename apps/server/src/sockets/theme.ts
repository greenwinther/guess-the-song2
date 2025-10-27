// src/sockets/theme.ts
import type { Server, Socket } from "socket.io";
import { getRoom } from "../store/roomStore";
import { setTheme, trySolveTheme } from "../logic/theme";
import { Ack, ackErr, ackOk } from "../utils/ack";
import { Room } from "../types";

function publicTheme(room: Room) {
	return { revealed: room.theme.revealed, hints: room.theme.hints, solvedBy: room.theme.solvedBy };
}

export function register(io: Server, socket: Socket) {
	socket.on("theme:set", ({ theme, hints = [] }: { theme: string; hints?: string[] }, ack?: Ack) => {
		const room = getRoom(socket.data.roomCode!);
		const me = room?.members.get(socket.data.memberId!);
		if (!room || !me?.isHost) return ackErr(ack, "NOT_HOST");
		setTheme(room, theme, hints);
		io.to(room.code).emit("theme:state", publicTheme(room));
		ackOk(ack, { ok: true });
	});

	socket.on("theme:reveal", (_: {}, ack?: Ack) => {
		const room = getRoom(socket.data.roomCode!);
		const me = room?.members.get(socket.data.memberId!);
		if (!room || !me?.isHost) return ackErr(ack, "NOT_HOST");
		room.theme.revealed = true;
		io.to(room.code).emit("theme:state", publicTheme(room));
		ackOk(ack, { ok: true });
	});

	socket.on("theme:guess", ({ guess }: { guess: string }, ack?: Ack) => {
		const room = getRoom(socket.data.roomCode!);
		if (!room) return ackErr(ack, "NO_ROOM");
		const res = trySolveTheme(room, socket.data.memberId!, guess);
		io.to(room.code).emit("theme:state", publicTheme(room));
		ackOk(ack, { ok: true, correct: res.correct });
	});
}
