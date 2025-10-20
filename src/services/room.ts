import { db } from "../db/db";
import { roomMembers, rooms } from "../db";
import { eq, and } from "drizzle-orm";
import { makeRoomCode, ttl } from "../utils/room";

export async function createRoomService(args: {
	theme?: string;
	themeHint?: string;
	backgroundUrl?: string;
}) {
	// 24h default lifetime
	const code = makeRoomCode(4);
	const [row] = await db
		.insert(rooms)
		.values({
			code,
			theme: args.theme,
			themeHint: args.themeHint,
			backgroundUrl: args.backgroundUrl,
			phase: "LOBBY",
			currentIndex: 0,
			expiresAt: ttl(24),
			isSaved: false,
		})
		.returning();
	return row;
}

export async function joinRoomService(args: {
	code: string;
	displayName: string;
	clientKey: string;
	hardcore?: boolean;
}) {
	const [room] = await db.select().from(rooms).where(eq(rooms.code, args.code)).limit(1);
	if (!room) throw new Error("ROOM_NOT_FOUND");

	// reuse existing member by (roomId, clientKey)
	const [existing] = await db
		.select()
		.from(roomMembers)
		.where(and(eq(roomMembers.roomId, room.id), eq(roomMembers.clientKey, args.clientKey)))
		.limit(1);

	if (existing) {
		// keep same guessingSeed; allow displayName/hardcore update
		const [updated] = await db
			.update(roomMembers)
			.set({
				displayName: args.displayName,
				hardcore: args.hardcore ?? existing.hardcore,
				isActive: true,
			})
			.where(eq(roomMembers.id, existing.id))
			.returning();
		return { room, member: updated };
	}

	// new member
	const guessingSeed = Math.floor(Math.random() * 1_000_000);
	const [member] = await db
		.insert(roomMembers)
		.values({
			roomId: room.id,
			displayName: args.displayName,
			role: "PLAYER", // promote to HOST elsewhere if needed
			hardcore: !!args.hardcore,
			clientKey: args.clientKey,
			guessingSeed,
			isActive: true,
		})
		.returning();

	return { room, member };
}
