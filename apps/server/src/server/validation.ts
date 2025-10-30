// Minimal runtime validation & normalization for rooms.json (no external libs)
import type { Room, Member, Submission, Guess, ThemeState } from "../types/index.js";

type JsonRoom = Omit<Room, "members" | "revealedSubmissionIds" | "theme"> & {
	members: any[];
	revealedSubmissionIds: any[];
	theme: any;
};

const isObj = (v: unknown): v is Record<string, unknown> => !!v && typeof v === "object" && !Array.isArray(v);

const isStr = (v: unknown): v is string => typeof v === "string";
const isBool = (v: unknown): v is boolean => typeof v === "boolean";
const isNum = (v: unknown): v is number => typeof v === "number" && Number.isFinite(v);

const asString = (v: unknown, d = ""): string => (isStr(v) ? v : d);
const asBool = (v: unknown, d = false): boolean => (isBool(v) ? v : d);
const asNum = (v: unknown, d = 0): number => (isNum(v) ? v : d);

function validateMember(raw: any): Member | null {
	if (!isObj(raw)) return null;
	const id = asString(raw.id);
	const name = asString(raw.name, "Player");
	const isHost = asBool(raw.isHost, false);
	const connected = asBool(raw.connected, false);
	const hardcore = raw.hardcore === undefined ? undefined : !!raw.hardcore;
	const lastSeen = raw.lastSeen === undefined ? undefined : asNum(raw.lastSeen, 0);
	if (!id) return null;
	return { id, name, isHost, connected, hardcore, lastSeen };
}

function validateSubmission(raw: any): Submission | null {
	if (!isObj(raw)) return null;
	const id = asString(raw.id);
	const title = asString(raw.title);
	const submitterName = asString(raw.submitterName);
	if (!id || !title || !submitterName) return null;
	return { id, title, submitterName };
}

function validateGuess(raw: any): Guess | null {
	if (!isObj(raw)) return null;
	const memberId = asString(raw.memberId);
	const submissionId = asString(raw.submissionId);
	const guessedSubmitterName = asString(raw.guessedSubmitterName);
	const at = raw.at === undefined ? undefined : asNum(raw.at, 0);
	if (!memberId || !submissionId || !guessedSubmitterName) return null;
	return { memberId, submissionId, guessedSubmitterName, at };
}

function validateTheme(raw: any): ThemeState {
	// Be forgiving: default missing fields
	const currentTheme = raw?.currentTheme ?? null;
	return {
		currentTheme: currentTheme === null ? null : String(currentTheme),
		normalizedTheme: raw?.normalizedTheme ?? null,
		hints: Array.isArray(raw?.hints) ? raw.hints.map(String) : [],
		revealed: !!raw?.revealed,
		solvedBy: Array.isArray(raw?.solvedBy) ? raw.solvedBy.map(String) : [],
	};
}

export function validateRoomJson(raw: any): Room | null {
	if (!isObj(raw)) return null;

	const code = asString(raw.code).toUpperCase();
	const phase = (
		["LOBBY", "GUESSING", "RECAP", "RESULTS"].includes(raw.phase as string) ? raw.phase : "LOBBY"
	) as Room["phase"];
	const currentIndex = Math.max(0, asNum(raw.currentIndex, 0));

	const membersArr = Array.isArray((raw as JsonRoom).members) ? (raw as JsonRoom).members : [];
	const members = new Map<string, Member>();
	for (const m of membersArr) {
		const v = validateMember(m);
		if (v) members.set(v.id, v);
	}

	const submissionsArr = Array.isArray(raw.submissions) ? raw.submissions : [];
	const submissions: Submission[] = [];
	for (const s of submissionsArr) {
		const v = validateSubmission(s);
		if (v) submissions.push(v);
	}

	const guessesArr = Array.isArray(raw.guesses) ? raw.guesses : [];
	const guesses: Guess[] = [];
	for (const g of guessesArr) {
		const v = validateGuess(g);
		if (v) guesses.push(v);
	}

	const revealedIdsArr = Array.isArray((raw as JsonRoom).revealedSubmissionIds)
		? (raw as JsonRoom).revealedSubmissionIds
		: [];
	const revealedSubmissionIds = new Set<string>(revealedIdsArr.map(String));

	const theme = validateTheme((raw as JsonRoom).theme ?? {});

	const rules =
		isObj(raw.rules) && isObj(raw.rules.score)
			? {
					allowGuessingInRecap: !!raw.rules.allowGuessingInRecap,
					maxOneGuessPerSong: !!raw.rules.maxOneGuessPerSong,
					score: {
						correctPerSong: asNum(raw.rules.score.correctPerSong, 1),
						themeSolveFirst: asNum(raw.rules.score.themeSolveFirst, 2),
						themeSolveLater: asNum(raw.rules.score.themeSolveLater, 1),
						hardcoreMultiplier: asNum(raw.rules.score.hardcoreMultiplier, 1.5),
					},
			  }
			: {
					allowGuessingInRecap: true,
					maxOneGuessPerSong: true,
					score: {
						correctPerSong: 1,
						themeSolveFirst: 2,
						themeSolveLater: 1,
						hardcoreMultiplier: 1.5,
					},
			  };

	const createdAt = asNum(raw.createdAt, Date.now());
	const expiresAt = asNum(raw.expiresAt, Date.now() + 24 * 60 * 60 * 1000);
	const saved = asBool(raw.saved, false);

	if (!code) return null;

	return {
		code,
		phase,
		currentIndex,
		members,
		submissions,
		guesses,
		revealedSubmissionIds,
		theme,
		rules,
		createdAt,
		expiresAt,
		saved,
	};
}
