import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { addSubmissionService } from "../services/submission";

const addSubmissionSchema = z.object({
	roomCode: z.string().trim().min(4),
	submitterName: z.string().trim().min(1).max(64),
	url: z.string().trim().url(),
	title: z.string().trim().optional(),
	thumbnailUrl: z.string().url().optional(),
	provider: z.string().trim().optional(),
	externalId: z.string().trim().optional(),
	addedByMemberId: z.number().int().positive().optional(),
	durationIso: z.string().optional(),
	durationSeconds: z.number().int().min(0).optional(),
});

type AddSubmissionInput = z.infer<typeof addSubmissionSchema>;

export function registerSubmissionSockets(io: Server) {
	io.on("connection", (socket: Socket) => {
		socket.on("submission:add", async (payload, cb) => {
			try {
				const data: AddSubmissionInput = addSubmissionSchema.parse(payload ?? {});
				const result = await addSubmissionService(data);

				io.to(`room:${data.roomCode}`).emit("playlist:item-added", {
					submission: result.submission,
					playlistItem: result.playlistItem,
				});

				cb?.({ ok: true, ...result });
			} catch (err: any) {
				// Surface specific errors for the UI
				const code =
					err?.message === "PLAYLIST_FULL"
						? "PLAYLIST_FULL"
						: err?.message === "ROOM_NOT_FOUND"
						? "ROOM_NOT_FOUND"
						: "SUBMISSION_ADD_FAILED";
				cb?.({ ok: false, error: code });
			}
		});
	});
}
