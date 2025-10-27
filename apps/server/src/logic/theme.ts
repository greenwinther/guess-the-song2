// src/logic/theme.ts
import type { Room } from "../types";

export const normalize = (s: string) =>
	s
		.toLowerCase()
		.replace(/\s+/g, " ")
		.trim()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "");

export function setTheme(room: Room, theme: string, hints: string[] = []) {
	room.theme.currentTheme = theme;
	room.theme.normalizedTheme = normalize(theme);
	room.theme.hints = hints;
	room.theme.revealed = false;
	room.theme.solvedBy = [];
}

export function trySolveTheme(room: Room, memberId: string, guess: string) {
	if (!room.theme.currentTheme) return { correct: false };
	const correct = normalize(guess) === room.theme.normalizedTheme;
	if (correct && !room.theme.solvedBy.includes(memberId)) room.theme.solvedBy.push(memberId);
	return { correct };
}
