// apps/server/scripts/devClient.ts
import { io } from "socket.io-client";
import fs from "fs";
import path from "path";

const URL = process.env.SERVER_URL || "http://127.0.0.1:8080";
const SESSION_PATH = path.join(process.cwd(), "scripts", ".devsession.json");

type Session = { roomCode: string; name: string; memberId?: string };
const loadSession = (): Session => {
	try {
		return JSON.parse(fs.readFileSync(SESSION_PATH, "utf8"));
	} catch {
		return { roomCode: "ABCD", name: "Dennis" };
	}
};
const saveSession = (s: Session) => fs.writeFileSync(SESSION_PATH, JSON.stringify(s, null, 2));

const session = loadSession();
const socket = io(URL, { reconnectionAttempts: 2, timeout: 5000 });

const emitAck = <T = any>(event: string, payload?: any) =>
	new Promise<T>((resolve, reject) => {
		socket.emit(event, payload ?? {}, (resp: any) => (resp?.ok === false ? reject(resp) : resolve(resp)));
	});

socket.on("connect", async () => {
	try {
		// 👇 pass memberId if we have one
		const join = await emitAck<{ memberId: string; room: any }>("room:join", {
			code: session.roomCode,
			name: session.name,
			memberId: session.memberId,
		});
		// Save the issued/stable memberId for next run
		session.memberId = join.memberId;
		saveSession(session);

		console.log("[join]", join.room.code, "memberId:", join.memberId);

		await emitAck("submission:add", {
			id: "yt1",
			title: "Song A",
			submitterName: "Sammy",
			detailHint: "Which year?",
			detail: "2010",
		});
		await emitAck("submission:add", {
			id: "yt2",
			title: "Song B",
			submitterName: "Alex",
			detailHint: "BPM?",
			detail: "128",
		});

		// (optional) set index to 0 → early tier; set to 1..N to test mid/late tiers
		await emitAck("game:setIndex", { currentIndex: 0 });

		await emitAck("guess:submit", {
			submissionId: "yt1",
			guessedSubmitterName: "Sammy",
			detailGuess: "2010",
		});
		await emitAck("guess:submit", {
			submissionId: "yt2",
			guessedSubmitterName: "Alex",
			detailGuess: "128",
		});

		await emitAck("theme:set", { theme: "Animals", hints: ["mammal"] });
		await emitAck("theme:guess", { guess: "Animals" });

		const score = await emitAck<{ scoreboard: any }>("score:compute");
		console.log("[score]");
		console.dir(score.scoreboard, { depth: null });
	} catch (e) {
		console.error("[devClient error]", e);
	} finally {
		process.exit(0);
	}
});

socket.on("connect_error", (err) => console.error("[client] connect_error:", err.message));
setTimeout(() => {
	console.error("[client] timeout");
	process.exit(1);
}, 15000);
