import { db } from "../db/db";
import { rooms } from "../db/schema/rooms";
import { eq } from "drizzle-orm";

function plusDays(days: number) {
	const d = new Date();
	d.setDate(d.getDate() + days);
	return d;
}

export async function saveRoomService(roomCode: string) {
	const [room] = await db.select().from(rooms).where(eq(rooms.code, roomCode)).limit(1);
	if (!room) throw new Error("ROOM_NOT_FOUND");

	const now = new Date();
	const newExpiry = plusDays(7); // save => 7 days from now

	const [updated] = await db
		.update(rooms)
		.set({
			isSaved: true,
			savedAt: now,
			expiresAt: newExpiry,
		})
		.where(eq(rooms.id, room.id))
		.returning();

	return updated;
}
