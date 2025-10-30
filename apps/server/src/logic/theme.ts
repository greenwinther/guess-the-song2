// src/logic/theme.ts
import type { Room } from "../types/index.js";
import { normalizeRoomCode } from "../utils/ids.js";

export function setTheme(room: Room, theme: string, hints: string[] = []) {
	room.theme.currentTheme = theme;
	room.theme.normalizedTheme = normalizeRoomCode(theme);
	room.theme.hints = hints;
	room.theme.revealed = false;
	room.theme.solvedBy = [];
	room.theme.attemptedBy = new Set<string>();
}

export function trySolveTheme(room: Room, memberId: string, guess: string) {
	if (!room.theme.currentTheme) return { correct: false, locked: false };
	if (!room.theme.attemptedBy) room.theme.attemptedBy = new Set<string>();

	// one attempt total per player
	if (room.theme.attemptedBy.has(memberId)) {
		return { correct: false, locked: true };
	}
	room.theme.attemptedBy.add(memberId);

	const correct = normalizeRoomCode(guess) === (room.theme.normalizedTheme ?? "");
	if (correct) {
		// only record once
		if (!room.theme.solvedBy.some((x) => x.memberId === memberId)) {
			room.theme.solvedBy.push({ memberId, atIndex: Math.max(0, room.currentIndex) });
		}
	}
	return { correct, locked: true };
}
