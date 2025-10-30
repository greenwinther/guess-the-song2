// src/logic/scoring.ts
import type { Room, ScoreBoard, ScoreRow } from "../types/index.js";
import { normalizeRoomCode } from "../utils/ids.js";

export function computeScores(room: Room): ScoreBoard {
	const rows = new Map<string, ScoreRow>();
	const ensure = (id: string) =>
		rows.get(id) ??
		(rows.set(id, {
			memberId: id,
			correctGuesses: 0,
			detailCorrect: 0,
			themeBonuses: 0,
			hardcoreBonus: 0,
			total: 0,
		}),
		rows.get(id)!);

	const sc = room.rules.score;

	// --- Per-song guesses: submitter name + detail
	for (const g of room.guesses) {
		const sub = room.submissions.find((s) => s.id === g.submissionId);
		if (!sub) continue;

		// submitter name correctness
		if (normalizeRoomCode(g.guessedSubmitterName) === normalizeRoomCode(sub.submitterName)) {
			ensure(g.memberId).correctGuesses += sc.correctPerSong;
		}

		// detail correctness (if both provided)
		if (
			sub.detail &&
			g.detailGuess &&
			normalizeRoomCode(g.detailGuess) === normalizeRoomCode(sub.detail)
		) {
			ensure(g.memberId).detailCorrect += sc.detailCorrect;
		}
	}

	// --- Theme tiered bonus (one attempt total enforced elsewhere)
	const totalSongs = Math.max(1, room.submissions.length);
	const earlyCut = Math.ceil(totalSongs * sc.themeEarlyPercent); // ≤ early ⇒ earlyPoints
	const midCut = Math.ceil(totalSongs * sc.themeMidPercent); // ≤ mid   ⇒ midPoints else latePoints

	for (const { memberId, atIndex } of room.theme.solvedBy) {
		const pos = Math.min(totalSongs, atIndex + 1); // 1-based song position when solved
		let pts = sc.themeLatePoints;
		if (pos <= earlyCut) pts = sc.themeEarlyPoints;
		else if (pos <= midCut) pts = sc.themeMidPoints;
		ensure(memberId).themeBonuses += pts;
	}

	// --- Hardcore multiplier (on total pre-multiplier points)
	for (const m of room.members.values()) {
		const r = ensure(m.id);
		const base = r.correctGuesses + r.detailCorrect + r.themeBonuses;
		if (m.hardcore) {
			const boosted = Math.round(base * sc.hardcoreMultiplier * 100) / 100;
			r.hardcoreBonus = boosted - base;
			r.total = boosted;
		} else {
			r.total = base;
		}
	}

	const ranked = [...rows.values()].sort((a, b) => b.total - a.total);
	return { byMember: Object.fromEntries([...rows.entries()].map(([k, v]) => [k, v])), ranked };
}
