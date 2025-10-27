// src/store/roomStore.ts
import { randomUUID } from "crypto";
import type { Room, Member } from "../types";

const rooms = new Map<string, Room>();

export const createRoom = (code: string): Room => {
	const room: Room = {
		code,
		phase: "LOBBY",
		currentIndex: 0,
		members: new Map(),
		submissions: [],
		guesses: [],
		revealedSubmissionIds: new Set(),
		theme: { currentTheme: null, normalizedTheme: null, hints: [], revealed: false, solvedBy: [] },
		rules: {
			allowGuessingInRecap: true,
			maxOneGuessPerSong: true,
			score: { correctPerSong: 1, themeSolveFirst: 1, themeSolveLater: 1, hardcoreMultiplier: 1 },
		},
		createdAt: Date.now(),
	};
	rooms.set(code, room);
	return room;
};

export const getRoom = (code?: string) => (code ? rooms.get(code) : undefined);

export const joinRoom = (code: string, name: string, memberId?: string) => {
	const room = rooms.get(code) ?? createRoom(code);
	const id = memberId ?? randomUUID();
	const existing = room.members.get(id);
	if (existing) {
		existing.connected = true;
		if (name) existing.name = name;
		return { room, member: existing };
	}
	const member: Member = { id, name, isHost: room.members.size === 0, connected: true };
	room.members.set(id, member);
	return { room, member };
};

export const markDisconnected = (code: string, memberId: string) => {
	const room = rooms.get(code);
	if (!room) return;
	const m = room.members.get(memberId);
	if (!m) return;
	m.connected = false;

	// host handover if needed
	if (m.isHost) {
		const next = [...room.members.values()].find((x) => x.connected && x.id !== memberId);
		if (next) next.isHost = true;
		m.isHost = false;
	}

	// prune if everyone gone
	if ([...room.members.values()].every((x) => !x.connected)) rooms.delete(code);
};

export const assignHost = (code: string, byId: string, targetId: string) => {
	const room = rooms.get(code);
	if (!room) return false;
	const by = room.members.get(byId);
	const target = room.members.get(targetId);
	if (!by?.isHost || !target) return false;
	for (const m of room.members.values()) m.isHost = false;
	target.isHost = true;
	return true;
};
