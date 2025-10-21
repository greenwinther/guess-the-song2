import type { Server, Socket } from "socket.io";
import { z } from "zod";
import { getPlaylistService, removePlaylistItemService, reorderPlaylistService } from "../services/playlist";

const getSchema = z.object({
	roomCode: z.string().trim().min(4),
});

const removeSchema = z.object({
	roomCode: z.string().trim().min(4),
	actorMemberId: z.number().int().positive(), // must be host
	playlistItemId: z.number().int().positive(),
});

const reorderSchema = z.object({
	roomCode: z.string().trim().min(4),
	actorMemberId: z.number().int().positive(), // must be host
	orderedIds: z.array(z.number().int().positive()).min(1),
});

export function registerPlaylistSockets(io: Server) {
	io.on("connection", (socket: Socket) => {
		socket.on("playlist:get", async (payload, cb) => {
			try {
				const { roomCode } = getSchema.parse(payload ?? {});
				const { room, items } = await getPlaylistService(roomCode);
				cb?.({
					ok: true,
					room: { code: room.code, currentIndex: room.currentIndex, phase: room.phase },
					items,
				});
			} catch (e: any) {
				cb?.({ ok: false, error: e?.message ?? "PLAYLIST_GET_FAILED" });
			}
		});

		socket.on("playlist:remove", async (payload, cb) => {
			try {
				const data = removeSchema.parse(payload ?? {});
				const res = await removePlaylistItemService(data);
				io.to(`room:${data.roomCode}`).emit("playlist:item-removed", {
					playlistItemId: data.playlistItemId,
				});
				// also broadcast a fresh list if you like:
				// const fresh = await getPlaylistService(data.roomCode);
				// io.to(`room:${data.roomCode}`).emit("playlist:updated", fresh.items);
				cb?.({ ok: true, ...res });
			} catch (e: any) {
				cb?.({ ok: false, error: e?.message ?? "PLAYLIST_REMOVE_FAILED" });
			}
		});

		socket.on("playlist:reorder", async (payload, cb) => {
			try {
				const data = reorderSchema.parse(payload ?? {});
				const res = await reorderPlaylistService(data);
				io.to(`room:${data.roomCode}`).emit("playlist:reordered", { orderedIds: data.orderedIds });
				cb?.({ ok: true, ...res });
			} catch (e: any) {
				cb?.({ ok: false, error: e?.message ?? "PLAYLIST_REORDER_FAILED" });
			}
		});
	});
}
