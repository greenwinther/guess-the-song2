import { db } from "../db/db";
import { rooms } from "../db/schema/rooms";
import { lt } from "drizzle-orm";
import { sql } from "drizzle-orm";

export async function previewExpiredRooms() {
	const rows = await db
		.select({ id: rooms.id, code: rooms.code, expiresAt: rooms.expiresAt })
		.from(rooms)
		.where(lt(rooms.expiresAt, new Date()));
	return rows;
}

export async function deleteExpiredRooms() {
	// return count of deleted rooms
	const now = new Date();
	const result = await db.execute(
		sql`delete from ${rooms} where ${rooms.expiresAt} < ${now} returning ${rooms.id}`
	);
	// result.rows may vary by driver; for pg it’s an array
	// @ts-ignore - narrow for pg
	const deletedCount = Array.isArray(result.rows) ? result.rows.length : 0;
	return { deletedCount };
}
