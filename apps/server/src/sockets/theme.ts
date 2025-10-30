// src/sockets/theme.ts
import type { Server, Socket } from "socket.io";
import { setTheme, trySolveTheme } from "../logic/theme.js";
import { Ack, ackErr, ackOk } from "../utils/ack.js";
import {
	requireHost,
	requireHostOrController,
	requireMember,
	requireRoom /*, requirePhase*/,
} from "../logic/guards.js";
import type { ThemeSetPayload, ThemeGuessPayload } from "./payloads.js";
import { Room } from "../types/index.js";

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
		const me = requireHostOrController(socket, room, ack);
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
		if (res.locked && !res.correct) return ackErr(ack, "THEME_LOCKED");
		return ackOk(ack, { correct: res.correct });
	});
}
