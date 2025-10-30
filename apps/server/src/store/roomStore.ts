// src/store/roomStore.ts
import { randomUUID } from "crypto";
import { isValidRoomCode, randomString } from "../utils/ids.js";
import { Member, Room } from "../types/index.js";
import { normalize } from "../utils/text.js";

const rooms = new Map<string, Room>();
const DAY = 24 * 60 * 60 * 1000;

export const createRoom = (code: string): Room => {
	const normalized = normalize(code);
	if (!isValidRoomCode(normalized)) throw new Error(`Invalid room code: "${code}"`);
	const now = Date.now();
	const room: Room = {
		code: normalized,
		phase: "LOBBY",
		currentIndex: 0,
		controllerId: undefined,
		hostKey: randomString(8),
		members: new Map(),
		submissions: [],
		guesses: [],
		revealedSubmissionIds: new Set(),
		theme: { currentTheme: null, normalizedTheme: null, hints: [], revealed: false, solvedBy: [] },
		rules: {
			allowGuessingInRecap: true,
			maxOneGuessPerSong: true,
			// roomStore.ts createRoom defaults
			score: {
				correctPerSong: 1,
				detailCorrect: 1,
				themeEarlyPercent: 0.2,
				themeMidPercent: 0.5,
				themeEarlyPoints: 3,
				themeMidPoints: 2,
				themeLatePoints: 1,
				hardcoreMultiplier: 1.5,
			},
		},
		createdAt: now,
		expiresAt: now + DAY, // default 1 day
		saved: false,
	};
	rooms.set(normalized, room);
	return room;
};

export const getRoom = (code?: string): Room | undefined => (code ? rooms.get(normalize(code)) : undefined);

export const joinRoom = (code: string, name: string, memberId?: string) => {
	const normalized = normalize(code);
	const room = rooms.get(normalized) ?? createRoom(normalized);

	const id = memberId ?? randomUUID();
	const displayName = (name ?? "").trim() || "Player";

	const existing = room.members.get(id);
	if (existing) {
		existing.connected = true;
		existing.name = displayName || existing.name;
		return { room, member: existing };
	}
	const member: Member = { id, name: displayName, isHost: room.members.size === 0, connected: true };
	room.members.set(id, member);
	return { room, member };
};

export const markDisconnected = (code: string, memberId: string) => {
	const room = getRoom(code);
	if (!room) return;
	const m = room.members.get(memberId);
	if (!m) return;

	m.connected = false;

	// Only hand over host if there is a *connected* alternative.
	if (m.isHost) {
		const next = [...room.members.values()].find((x) => x.connected && x.id !== memberId);
		if (next) {
			for (const mm of room.members.values()) mm.isHost = false;
			next.isHost = true;
		} else {
			// No alternative → KEEP m as host even while disconnected
			m.isHost = true;
		}
	}

	// prune if everyone gone
	if ([...room.members.values()].every((x) => !x.connected)) rooms.delete(code);
};

export const assignHost = (code: string, byId: string, targetId: string) => {
	const room = getRoom(code);
	if (!room) return false;
	const by = room.members.get(byId);
	const target = room.members.get(targetId);
	if (!by?.isHost || !target) return false;
	for (const m of room.members.values()) m.isHost = false;
	target.isHost = true;
	return true;
};

// ----- TTL control -----

/** Extend room TTL to 7 days and set saved=true */
export const markSaved = (code: string) => {
	const room = getRoom(code);
	if (!room) return false;
	const now = Date.now();
	room.saved = true;
	room.expiresAt = now + 7 * DAY;
	return true;
};

/** Revert to default TTL (1 day from now), e.g. if user un-saves. */
export const markUnsaved = (code: string) => {
	const room = getRoom(code);
	if (!room) return false;
	const now = Date.now();
	room.saved = false;
	room.expiresAt = now + DAY;
	return true;
};

// ----- GC hooks used by persistence -----
export function iterRooms(): IterableIterator<[string, Room]> {
	return rooms.entries();
}
export function _gcDelete(code: string): boolean {
	return rooms.delete(normalize(code));
}
export function reviveRoomIntoStore(room: Room) {
	rooms.set(normalize(room.code), room);
}
