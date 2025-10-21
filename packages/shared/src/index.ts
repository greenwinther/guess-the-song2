// Socket event typings
export type Phase = "LOBBY" | "GUESSING" | "RECAP";

export interface ScoreEntry {
	memberId: number;
	name: string;
	hardcore: boolean;
	guessPoints: number;
	themePoints: number;
	totalPoints: number;
}

export interface RoomUpdatePayload {
	phase?: Phase;
	currentIndex?: number;
	members?: Array<{ id: number; displayName: string; hardcore: boolean }>;
}

export interface ServerToClientEvents {
	"room:update": (payload: RoomUpdatePayload) => void;
	"playlist:started": (payload: { playlistItemId: number }) => void;
	"guess:locked": (payload: { playlistItemId: number; guesserId: number }) => void;
	"themeAttempt:locked": (payload: { position: number; guesserId: number }) => void;
	"reveal:result": (payload: { playlistItemId: number; correctSubmitterId: number }) => void;
	"scores:updated": (scores: ScoreEntry[]) => void;
}

export interface ClientToServerEvents {
	"room:create": (body: {}, ack: (res: any) => void) => void;
	"room:join": (
		body: {
			code: string;
			displayName: string;
			role: "HOST" | "PLAYER" | "SPECTATOR";
			hardcore?: boolean;
		},
		ack: (res: any) => void
	) => void;
	"room:save": (body: { code: string }, ack: (res: any) => void) => void;

	"submission:add": (body: { code: string; url: string }, ack: (res: any) => void) => void;

	"game:start": (body: { code: string }, ack: (res: any) => void) => void;
	"song:next": (body: { code: string }, ack: (res: any) => void) => void;

	"guess:upsert": (
		body: { code: string; playlistItemId: number; guessedSubmitterId: number },
		ack: (res: any) => void
	) => void;
	"guess:lock": (body: { code: string; playlistItemId?: number }, ack: (res: any) => void) => void;

	"themeAttempt:upsert": (
		body: { code: string; position: number; text: string },
		ack: (res: any) => void
	) => void;
	"themeAttempt:lock": (body: { code: string; position: number }, ack: (res: any) => void) => void;

	"reveal:nextSong": (body: { code: string }, ack: (res: any) => void) => void;
	"scores:get": (body: { code: string }, ack: (res: { ok: boolean; scores: ScoreEntry[] }) => void) => void;
}

export type Ack<T = any> = (res: T) => void;
