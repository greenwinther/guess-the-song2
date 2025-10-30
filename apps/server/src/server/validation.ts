// Minimal runtime validation & normalization for rooms.json (no external libs)
import { defaultMaxListeners } from "events";
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
	let submitterName = asString(raw.submitterName);
	if (!submitterName && isStr(raw.submitterId)) submitterName = String(raw.submitterId);
	const detailHint = raw.detailHint === undefined ? undefined : String(raw.detailHint);
	const detail = raw.detail === undefined ? undefined : String(raw.detail);
	if (!id || !title || !submitterName) return null;
	return { id, title, submitterName, detailHint, detail };
}

function validateGuess(raw: any): Guess | null {
	if (!isObj(raw)) return null;
	const memberId = asString(raw.memberId);
	const submissionId = asString(raw.submissionId);
	const guessedSubmitterName = asString(raw.guessedSubmitterName);
	const at = raw.at === undefined ? undefined : asNum(raw.at, 0);
	const detailGuess = raw.detailGuess === undefined ? undefined : String(raw.detailGuess);
	if (!memberId || !submissionId || !guessedSubmitterName) return null;
	return { memberId, submissionId, guessedSubmitterName, at, detailGuess };
}

function validateTheme(raw: any): ThemeState {
	const currentTheme = raw?.currentTheme ?? null;
	const attemptedByArr = Array.isArray(raw?.attemptedBy) ? raw.attemptedBy.map(String) : [];
	return {
		currentTheme: currentTheme === null ? null : String(currentTheme),
		normalizedTheme: raw?.normalizedTheme ?? null,
		hints: Array.isArray(raw?.hints) ? raw.hints.map(String) : [],
		revealed: !!raw?.revealed,
		solvedBy: Array.isArray(raw?.solvedBy)
			? raw.solvedBy.map((x: any) => ({
					memberId: String(x?.memberId),
					atIndex: Math.max(0, Number(x?.atIndex ?? 0)),
			  }))
			: [],
		attemptedBy: new Set<string>(attemptedByArr),
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

	const controllerId = asString(raw.controllerId, undefined);

	const hostKey = asString(raw.hostKey, undefined);

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
						detailCorrect: asNum(raw.rules.score.detailCorrect, 1),
						themeEarlyPercent: asNum(raw.rules.score.themeEarlyPercent, 0.2),
						themeMidPercent: asNum(raw.rules.score.themeMidPercent, 0.5),
						themeEarlyPoints: asNum(raw.rules.score.themeEarlyPoints, 3),
						themeMidPoints: asNum(raw.rules.score.themeMidPoints, 2),
						themeLatePoints: asNum(raw.rules.score.themeLatePoints, 1),
						hardcoreMultiplier: asNum(raw.rules.score.hardcoreMultiplier, 1.5),
					},
			  }
			: {
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
			  };

	const createdAt = asNum(raw.createdAt, Date.now());
	const expiresAt = asNum(raw.expiresAt, Date.now() + 24 * 60 * 60 * 1000);
	const saved = asBool(raw.saved, false);

	if (!code) return null;

	return {
		code,
		phase,
		currentIndex,
		controllerId,
		hostKey,
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
