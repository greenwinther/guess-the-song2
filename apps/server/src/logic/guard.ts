import type { Socket } from "socket.io";
import type { Phase, Room } from "../types";
import { getRoom } from "../store/roomStore";
import { ackErr, Ack } from "../utils/ack";

/** Ensure the socket has a bound room and that room exists. */
export function requireRoom(socket: Socket, ack?: Ack): Room | null {
	const code = socket.data.roomCode as string | undefined;
	if (!code) {
		ackErr(ack, "NO_ROOM");
		return null;
	}
	const room = getRoom(code);
	if (!room) {
		ackErr(ack, "NO_ROOM");
		return null;
	}
	return room;
}

/** Fetch the current member object from the room. */
export function requireMember(socket: Socket, room: Room, ack?: Ack) {
	const memberId = socket.data.memberId as string | undefined;
	if (!memberId) {
		ackErr(ack, "NO_MEMBER");
		return null;
	}
	const me = room.members.get(memberId);
	if (!me) {
		ackErr(ack, "NO_MEMBER");
		return null;
	}
	return me;
}

/** Host-only guard. */
export function requireHost(socket: Socket, room: Room, ack?: Ack) {
	const me = requireMember(socket, room, ack);
	if (!me) return null;
	if (!me.isHost) {
		ackErr(ack, "NOT_HOST");
		return null;
	}
	return me;
}

/** Phase guard: allow only if room.phase is in `allowed`. */
export function requirePhase(room: Room, allowed: Phase[] | Phase, ack?: Ack) {
	const list = Array.isArray(allowed) ? allowed : [allowed];
	if (!list.includes(room.phase)) {
		ackErr(ack, "PHASE_LOCKED", { phase: room.phase, allowed: list });
		return false;
	}
	return true;
}

/** Convenience: allow guessing in GUESSING or (RECAP if rule permits). */
export function allowGuessing(room: Room): boolean {
	return room.phase === "GUESSING" || (room.phase === "RECAP" && room.rules.allowGuessingInRecap);
}
