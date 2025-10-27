// src/server/persistence.ts
import fs from "fs";
import path from "path";
import type { Room, Member } from "../types/index.js";
import { iterRooms, _gcDelete, reviveRoomIntoStore } from "../store/roomStore.js";
import { validateRoomJson } from "./validation.js";

// Where to store the JSON file
const DATA_DIR = path.resolve(process.cwd(), "data");
const ROOMS_FILE = path.join(DATA_DIR, "rooms.json");

// Convert in-memory (Map/Set) → plain JSON
function roomToJSON(room: Room) {
	return {
		...room,
		members: [...room.members.values()],
		revealedSubmissionIds: [...room.revealedSubmissionIds],
	};
}

export async function loadRoomsFromDisk() {
	try {
		if (!fs.existsSync(ROOMS_FILE)) return;
		const raw = await fs.promises.readFile(ROOMS_FILE, "utf8");
		const parsed = JSON.parse(raw);
		if (!Array.isArray(parsed)) return;

		const now = Date.now();
		let loaded = 0,
			skipped = 0,
			expired = 0;

		for (const r of parsed) {
			const room = validateRoomJson(r);
			if (!room) {
				skipped++;
				continue;
			}
			if (room.expiresAt < now) {
				expired++;
				continue;
			}
			reviveRoomIntoStore(room);
			loaded++;
		}
		console.log(`[persistence] rooms loaded=${loaded}, expired=${expired}, skipped=${skipped}`);
		await gcAndPersist();
	} catch (e) {
		console.error("[persistence] load failed:", e);
	}
}

export async function persistRoomsToDisk() {
	try {
		if (!fs.existsSync(DATA_DIR)) await fs.promises.mkdir(DATA_DIR, { recursive: true });
		const list: any[] = [];
		for (const [, room] of iterRooms()) list.push(roomToJSON(room));
		const tmp = `${ROOMS_FILE}.tmp`;
		await fs.promises.writeFile(tmp, JSON.stringify(list, null, 2), "utf8");
		await fs.promises.rename(tmp, ROOMS_FILE);
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
