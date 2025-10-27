// src/sockets/theme.ts
import type { Server, Socket } from "socket.io";
import { setTheme, trySolveTheme } from "../logic/theme";
import { Ack, ackOk } from "../utils/ack";
import type { Room } from "../types";
import { requireHost, requireMember, requireRoom /*, requirePhase*/ } from "../logic/guards";
import type { ThemeSetPayload, ThemeGuessPayload } from "./payloads";

function publicTheme(room: Room) {
	return { revealed: room.theme.revealed, hints: room.theme.hints, solvedBy: room.theme.solvedBy };
}

export function register(io: Server, socket: Socket) {
	socket.on("theme:set", ({ theme, hints = [] }: ThemeSetPayload, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		const me = requireHost(socket, room, ack);
		if (!me) return;

		setTheme(room, theme, hints);
		io.to(room.code).emit("theme:state", publicTheme(room));
		ackOk(ack, { themeSet: true });
	});

	socket.on("theme:reveal", (_: {}, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		const me = requireHost(socket, room, ack);
		if (!me) return;

		room.theme.revealed = true;
		io.to(room.code).emit("theme:state", publicTheme(room));
		return ackOk(ack, { revealed: true });
	});

	socket.on("theme:guess", ({ guess }: ThemeGuessPayload, ack?: Ack) => {
		const room = requireRoom(socket, ack);
		if (!room) return;
		const me = requireMember(socket, room, ack);
		if (!me) return;

		// Optional: restrict phases
		// if (!requirePhase(room, ["GUESSING","RECAP"], ack)) return;

		const res = trySolveTheme(room, me.id, guess);
		io.to(room.code).emit("theme:state", publicTheme(room));
		return ackOk(ack, { correct: res.correct });
	});
}
