// src/sockets/payloads.ts
export type GameSetPhasePayload = { phase: import("../types/index.js").Phase };
export type GameSetIndexPayload = { index: number };

export type GuessSubmitPayload = {
	submissionId: string;
	guessedSubmitterName: string;
};

export type PlayerSetHardcorePayload = { hardcore: boolean };
export type PlayerRenamePayload = { name: string };

export type RoomCreatePayload = { code: string };
export type RoomJoinPayload = { code: string; name: string; memberId?: string };
export type HostAssignPayload = { targetId: string };

export type SubmissionAddPayload = {
	id: string;
	title: string;
	submitterName: string;
};
export type SubmissionRemovePayload = { id: string };

export type ThemeSetPayload = { theme: string; hints?: string[] };
export type ThemeGuessPayload = { guess: string };
