// src/types.ts
export type Phase = "LOBBY" | "GUESSING" | "RECAP" | "RESULTS";

export interface Member {
	id: string; // socket-independent (sessionId)
	name: string;
	isHost: boolean;
	connected: boolean;
	hardcore?: boolean;
	lastSeen?: number; // unix ms
}

export interface Submission {
	id: string; // e.g. youtube videoId
	title: string;
	submitterId: string; // member who submitted
	durationSec?: number;
}

export interface Guess {
	memberId: string;
	submissionId: string;
	guessedSubmitterId: string;
	at?: number;
}

// --- Theme mini-game ---
export interface ThemeState {
	currentTheme: string | null; // secret; only host sees full string
	normalizedTheme?: string | null; // server keeps normalized form for checks
	hints: string[]; // hint strings revealed over time
	revealed: boolean; // if the theme has been fully revealed
	// who solved it (first-solves are useful for bonus points)
	solvedBy: string[]; // memberIds in solve order
}

export interface ThemeAttempt {
	memberId: string;
	guess: string;
	normalizedGuess: string;
	correct: boolean;
	at: number;
}

// --- Scores ---
export interface ScoreRow {
	memberId: string;
	correctGuesses: number;
	themeBonuses: number;
	hardcoreBonus: number;
	total: number;
}

export interface ScoreBoard {
	byMember: Record<string, ScoreRow>;
	ranked: ScoreRow[]; // sorted high → low
}

// --- Room ---
export interface Room {
	code: string;
	phase: Phase;
	currentIndex: number;

	members: Map<string, Member>;
	submissions: Submission[];

	// gameplay state
	guesses: Guess[]; // append/idempotent per (memberId, submissionId)
	revealedSubmissionIds: Set<string>; // revealed in RECAP
	theme: ThemeState; // ✅ theme state

	// options
	rules: {
		allowGuessingInRecap: boolean; // you wanted this ON
		maxOneGuessPerSong: boolean; // true (your rule)
		score: {
			correctPerSong: number; // e.g. 1
			themeSolveFirst: number; // e.g. +2
			themeSolveLater: number; // e.g. +1
			hardcoreMultiplier: number; // e.g. 1.5x
		};
	};

	createdAt: number;
	expiresAt: number; // unix ms
	saved: boolean; // false = 1-day TTL, true = 7-day TTL
	hostLockAll?: boolean;
}
