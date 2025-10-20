import { db } from "../db/db";
import { rooms } from "../db/schema/rooms";
import { memberScores } from "../db/schema/scores";
import { roomMembers } from "../db/schema/members";
import { eq, desc } from "drizzle-orm";

export async function getScoresService(roomCode: string) {
	const [room] = await db.select().from(rooms).where(eq(rooms.code, roomCode)).limit(1);
	if (!room) throw new Error("ROOM_NOT_FOUND");

	const rows = await db
		.select({
			memberId: roomMembers.id,
			name: roomMembers.displayName,
			hardcore: roomMembers.hardcore,
			guessPoints: memberScores.guessPoints,
			themePoints: memberScores.themePoints,
			totalPoints: memberScores.totalPoints,
		})
		.from(roomMembers)
		.leftJoin(memberScores, eq(memberScores.memberId, roomMembers.id))
		.where(eq(roomMembers.roomId, room.id))
		.orderBy(
			desc(memberScores.totalPoints),
			desc(memberScores.guessPoints),
			desc(memberScores.themePoints)
		);

	// fill nulls with 0 for members without score rows yet
	return rows.map((r) => ({
		memberId: r.memberId,
		name: r.name,
		hardcore: r.hardcore,
		guessPoints: r.guessPoints ?? 0,
		themePoints: r.themePoints ?? 0,
		totalPoints: r.totalPoints ?? 0,
	}));
}
