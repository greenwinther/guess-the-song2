// apps/server/scripts/testScoring.unit.ts npm --workspace apps/server run test:unit
import assert from "node:assert/strict";
import { computeScores } from "../src/logic/scoring.js";
import type { Room } from "../src/types/index.js";

function baseRoom(): Room {
	return {
		code: "UNIT",
		phase: "GUESSING",
		currentIndex: 0,
		members: new Map([
			["m1", { id: "m1", name: "Dennis", isHost: true, connected: true }],
			["m2", { id: "m2", name: "Luxx", isHost: false, connected: true }],
		]),
		submissions: [
			{ id: "1", title: "A", videoId: "a1", submitterName: "Sammy", detailHint: "Y", detail: "2010" },
			{ id: "2", title: "B", videoId: "b2", submitterName: "Alex", detailHint: "B", detail: "128" },
		],
		hostKey: "host-UNIT",
		guesses: [],
		revealedSubmissionIds: new Set(),
		theme: {
			currentTheme: "Animals",
			normalizedTheme: null,
			hints: [],
			revealed: true,
			solvedBy: [{ memberId: "m1", atIndex: 2 }],
			attemptedBy: new Set(),
		},
		rules: {
			allowGuessingInRecap: true,
			maxOneGuessPerSong: true,
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
		createdAt: Date.now(),
		saved: false,
		expiresAt: Date.now() + 7 * 86400000,
	};
}

(function run() {
	const room = baseRoom();

	// m1 guesses both correctly by ID and detail
	room.guesses.push(
		{ memberId: "m1", submissionId: "1", guessedSubmissionId: "1", detailGuess: "2010", at: Date.now() },
		{ memberId: "m1", submissionId: "2", guessedSubmissionId: "2", detailGuess: "128", at: Date.now() }
	);

	const sb = computeScores(room);

	const r = sb.byMember["m1"];
	assert.equal(r.correctGuesses, 2, "two correct submitter guesses");
	assert.equal(r.detailCorrect, 2, "two correct details");
	assert.equal(r.themeBonuses, 1, "late tier = 1 point");
	assert.equal(r.hardcoreBonus, 0, "not hardcore");
	assert.equal(r.total, 5, "2 + 2 + 1 = 5");

	console.log("✅ testScoring.unit passed:", sb);
})();
