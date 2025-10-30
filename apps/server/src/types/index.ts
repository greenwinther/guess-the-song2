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
	submitterName: string;
	detailHint?: string;
	detail?: string;
}

export interface Guess {
	memberId: string;
	submissionId: string;
	guessedSubmitterName: string;
	detailGuess?: string;
	at?: number;
}

// --- Theme mini-game ---
export interface ThemeState {
	currentTheme: string | null; // secret; only host sees full string
	normalizedTheme?: string | null; // server keeps normalized form for checks
	hints: string[]; // hint strings revealed over time
	revealed: boolean; // if the theme has been fully revealed
	// who solved it (first-solves are useful for bonus points)
	solvedBy: Array<{ memberId: string; atIndex: number }>;
	attemptedBy?: Set<string>;
}

// --- Scores ---
export interface ScoreRow {
	memberId: string;
	correctGuesses: number;
	detailCorrect: number;
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

	controllerId?: string; // current showrunner (optional)
	hostKey: string; // secret for claiming (see below)

	// gameplay state
	guesses: Guess[]; // append/idempotent per (memberId, submissionId)
	revealedSubmissionIds: Set<string>; // revealed in RECAP
	theme: ThemeState; // ✅ theme state

	// options
	rules: {
		allowGuessingInRecap: boolean; // you wanted this ON
		maxOneGuessPerSong: boolean; // true (your rule)
		score: {
			correctPerSong: number; // submitter name correct per song
			detailCorrect: number; // NEW: per-song detail correct
			// Tiered theme config (defaults: 20% => 3, 50% => 2, else 1)
			themeEarlyPercent: number; // e.g. 0.2
			themeMidPercent: number; // e.g. 0.5
			themeEarlyPoints: number; // e.g. 3
			themeMidPoints: number; // e.g. 2
			themeLatePoints: number; // e.g. 1
			hardcoreMultiplier: number;
		};
	};

	createdAt: number;
	expiresAt: number; // unix ms
	saved: boolean; // false = 1-day TTL, true = 7-day TTL
	hostLockAll?: boolean;
}
