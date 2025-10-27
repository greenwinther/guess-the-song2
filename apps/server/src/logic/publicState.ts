// src/logic/publicState.ts
import type { Room } from "../types";

export function toPublicRoomState(room: Room) {
	return {
		code: room.code,
		phase: room.phase,
		currentIndex: room.currentIndex,
		members: [...room.members.values()].map((m) => ({
			id: m.id,
			name: m.name,
			isHost: m.isHost,
			connected: m.connected,
			hardcore: !!m.hardcore,
		})),
		submissions: room.submissions,
		revealedSubmissionIds: [...room.revealedSubmissionIds],
		theme: {
			revealed: room.theme.revealed,
			hints: room.theme.hints,
			solvedBy: room.theme.solvedBy,
		},
	};
}
