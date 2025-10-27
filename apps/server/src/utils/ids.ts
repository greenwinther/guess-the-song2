// ID utilities for rooms & members, with no external deps.

import { randomUUID, randomBytes } from "crypto";

/** Stable member/session id (store in localStorage client-side). */
export function newMemberId(): string {
	try {
		return randomUUID(); // RFC 4122 v4
	} catch {
		// Fallback for exotic runtimes
		return "m_" + randomBytes(16).toString("hex");
	}
}

/** Room codes like “K7X3QZ”. Omit ambiguous chars for readability. */
const ROOM_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"; // no I, O, 0, 1

export function randomString(len: number, alphabet = ROOM_ALPHABET): string {
	const buf = randomBytes(len);
	let out = "";
	for (let i = 0; i < len; i++) out += alphabet[buf[i] % alphabet.length];
	return out;
}

/** Create a human-friendly room code (default length 6). */
export function newRoomCode(length = 6): string {
	return randomString(length);
}

/** Quick short id for submissions if you need local keys. */
export function shortId(prefix = "id"): string {
	const t = Date.now().toString(36);
	const r = randomBytes(3).toString("hex");
	return `${prefix}_${t}${r}`;
}

/** Validate a room code against our alphabet/length. */
export function isValidRoomCode(code: string, length = 6): boolean {
	const re = new RegExp(`^[${ROOM_ALPHABET}]{${length}}$`);
	return re.test(code);
}
