// client/lib/socket.ts
import { io, Socket } from "socket.io-client";

type Ack<T = any> = (resp: { ok: boolean } & T) => void;

const KEY = "gts2.session";
export const loadSession = () => JSON.parse(localStorage.getItem(KEY) || "{}");
export const saveSession = (s: any) => localStorage.setItem(KEY, JSON.stringify(s));

export class GtsSocket {
	private socket: Socket;

	constructor(url: string) {
		this.socket = io(url, { autoConnect: true });
		this.socket.on("connect", () => {
			const s = loadSession();
			if (s.roomCode && s.name) {
				this.join(s.roomCode, s.name, s.memberId);
			}
		});
	}

	join(code: string, name: string, memberId?: string) {
		this.socket.emit("room:join", { code, name, memberId }, (resp: any) => {
			if (resp?.ok) saveSession({ roomCode: code, name, memberId: resp.memberId });
		});
	}

	saveRoom(cb?: Ack<{ saved: boolean; expiresAt: number }>) {
		this.socket.emit("room:save", {}, cb);
	}
	unsaveRoom(cb?: Ack<{ saved: boolean; expiresAt: number }>) {
		this.socket.emit("room:unsave", {}, cb);
	}

	setHardcore(hardcore: boolean, cb?: Ack) {
		this.socket.emit("player:setHardcore", { hardcore }, cb);
	}

	setPhase(phase: "LOBBY" | "GUESSING" | "RECAP" | "RESULTS", cb?: Ack) {
		this.socket.emit("game:setPhase", { phase }, cb);
	}

	setIndex(index: number, cb?: Ack) {
		this.socket.emit("game:setIndex", { index }, cb);
	}

	submitGuess(submissionId: string, guessedSubmitterId: string, cb?: Ack) {
		this.socket.emit("guess:submit", { submissionId, guessedSubmitterId }, cb);
	}

	setTheme(theme: string, hints: string[] = [], cb?: Ack) {
		this.socket.emit("theme:set", { theme, hints }, cb);
	}
	revealTheme(cb?: Ack) {
		this.socket.emit("theme:reveal", {}, cb);
	}

	onRoomState(fn: (state: any) => void) {
		this.socket.on("room:state", fn);
	}
	onSubmissionList(fn: (subs: any[]) => void) {
		this.socket.on("submission:list", fn);
	}
	onRevealUpdate(fn: (ids: string[]) => void) {
		this.socket.on("reveal:update", fn);
	}
	onThemeState(fn: (t: any) => void) {
		this.socket.on("theme:state", fn);
	}
	onScoreUpdate(fn: (sb: any) => void) {
		this.socket.on("score:update", fn);
	}
}
