// src/logic/scoring.ts
import type { Room, ScoreBoard, ScoreRow } from "../types";

export function computeScores(room: Room): ScoreBoard {
	const rows = new Map<string, ScoreRow>();
	const ensure = (id: string) =>
		rows.get(id) ??
		(rows.set(id, { memberId: id, correctGuesses: 0, themeBonuses: 0, hardcoreBonus: 0, total: 0 }),
		rows.get(id)!);

	// correct guesses
	for (const g of room.guesses) {
		const sub = room.submissions.find((s) => s.id === g.submissionId);
		if (!sub) continue;
		if (g.guessedSubmitterId === sub.submitterId) {
			ensure(g.memberId).correctGuesses += room.rules.score.correctPerSong;
		}
	}

	// theme bonuses
	const first = room.theme.solvedBy[0];
	if (first) ensure(first).themeBonuses += room.rules.score.themeSolveFirst;
	for (const m of room.theme.solvedBy.slice(1)) ensure(m).themeBonuses += room.rules.score.themeSolveLater;

	// hardcore multiplier (on guess points only)
	for (const m of room.members.values()) {
		const r = ensure(m.id);
		const base = r.correctGuesses + r.themeBonuses;
		if (m.hardcore) {
			const bonus = Math.round(r.correctGuesses * (room.rules.score.hardcoreMultiplier - 1));
			r.hardcoreBonus = bonus;
			r.total = base + bonus;
		} else {
			r.total = base;
		}
	}

	const ranked = [...rows.values()].sort((a, b) => b.total - a.total);
	return { byMember: Object.fromEntries([...rows.entries()].map(([k, v]) => [k, v])), ranked };
}
