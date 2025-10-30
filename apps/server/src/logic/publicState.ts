// src/logic/publicState.ts
import type { Room } from "../types/index.js";

export function toPublicRoomState(room: Room) {
	return {
		code: room.code,
		phase: room.phase,
		currentIndex: room.currentIndex,
		controllerId: room.controllerId ?? null,
		members: [...room.members.values()].map((m) => ({
			id: m.id,
			name: m.name,
			isHost: m.isHost,
			connected: m.connected,
			hardcore: !!m.hardcore,
		})),
		submissions: room.submissions.map((s) => ({
			id: s.id,
			title: s.title,
			submitterName: s.submitterName,
			detailHint: s.detailHint ?? undefined, // expose hint only
			// detail is intentionally omitted
		})),
		revealedSubmissionIds: [...room.revealedSubmissionIds],
		theme: {
			revealed: room.theme.revealed,
			hints: room.theme.hints,
			solvedBy: room.theme.solvedBy.map((x) => x.memberId), // only memberIds
		},
		saved: room.saved,
		expiresAt: room.expiresAt,
	};
}
