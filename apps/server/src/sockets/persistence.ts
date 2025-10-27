// src/server/persistence.ts
import fs from "fs";
import path from "path";
import type { Room, Member } from "../types";
import { iterRooms, _gcDelete, reviveRoomIntoStore } from "../store/roomStore";

// Where to store the JSON file
const DATA_DIR = path.resolve(process.cwd(), "data");
const ROOMS_FILE = path.join(DATA_DIR, "rooms.json");

// Convert in-memory (Map/Set) → plain JSON
function roomToJSON(room: Room) {
	return {
		...room,
		members: [...room.members.values()], // Map -> array
		revealedSubmissionIds: [...room.revealedSubmissionIds], // Set -> array
	};
}

// Convert plain JSON → in-memory structures
function jsonToRoom(json: any): Room {
	const room: Room = {
		...json,
		members: new Map<string, Member>(json.members.map((m: Member) => [m.id, m])),
		revealedSubmissionIds: new Set<string>(json.revealedSubmissionIds ?? []),
	};
	return room;
}

export async function loadRoomsFromDisk() {
	try {
		if (!fs.existsSync(ROOMS_FILE)) return;
		const raw = await fs.promises.readFile(ROOMS_FILE, "utf8");
		const parsed = JSON.parse(raw) as any[];
		const now = Date.now();
		for (const r of parsed) {
			// Skip expired
			if (typeof r.expiresAt === "number" && r.expiresAt < now) continue;
			reviveRoomIntoStore(jsonToRoom(r));
		}
		// After loading, run one GC pass to be safe
		await gcAndPersist();
	} catch (e) {
		console.error("[persistence] load failed:", e);
	}
}

export async function persistRoomsToDisk() {
	try {
		if (!fs.existsSync(DATA_DIR)) await fs.promises.mkdir(DATA_DIR, { recursive: true });

		const list: any[] = [];
		for (const [, room] of iterRooms()) {
			list.push(roomToJSON(room));
		}

		const tmp = `${ROOMS_FILE}.tmp`;
		await fs.promises.writeFile(tmp, JSON.stringify(list, null, 2), "utf8");
		await fs.promises.rename(tmp, ROOMS_FILE); // atomic replace
	} catch (e) {
		console.error("[persistence] save failed:", e);
	}
}

export async function gcAndPersist() {
	const now = Date.now();
	for (const [code, room] of iterRooms()) {
		if (room.expiresAt < now) _gcDelete(code);
	}
	await persistRoomsToDisk();
}
