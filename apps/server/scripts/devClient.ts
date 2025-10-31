// apps/server/scripts/devClient.ts npm run dev:client
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

const emitAck = <T = any>(event: string, payload?: any, ms = 5000) =>
	new Promise<T>((resolve, reject) => {
		const t = setTimeout(() => reject({ ok: false, error: `ACK_TIMEOUT:${event}` }), ms);
		console.log(`[emit] ${event}`, payload ?? {});
		socket.emit(event, payload ?? {}, (resp: any) => {
			clearTimeout(t);
			console.log(`[ack ] ${event}`, resp);
			if (resp?.ok === false) return reject(resp);
			resolve(resp as T);
		});
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

		// after join succeeds:
		console.log("[join]", join.room.code, "memberId:", join.memberId);

		// add songs, then guess
		const s1 = await emitAck<{ id: string }>("submission:add", {
			id: "1",
			title: "Song A",
			videoId: "abc123",
			submitterName: "Sammy",
			detailHint: "Which year?",
			detail: "2010",
		});
		const s2 = await emitAck<{ id: string }>("submission:add", {
			id: "2",
			title: "Song B",
			videoId: "def456",
			submitterName: "Alex",
			detailHint: "BPM?",
			detail: "128",
		});
		const s3 = await emitAck<{ id: string }>("submission:add", {
			id: "3",
			title: "Song C",
			videoId: "ghi789",
			submitterName: "Berit",
			detailHint: "BPM?",
			detail: "123",
		});

		// host-only
		await emitAck("theme:set", { theme: "Animals", hints: ["mammal"] });
		await emitAck("game:setPhase", { phase: "GUESSING" });
		await emitAck("game:setIndex", { currentIndex: 0 });

		// Guess the submitter by pointing to their *submission id*
		await emitAck("guess:submit", {
			submissionId: s1.id, // guessing for Song A
			guessedSubmissionId: s1.id, // “Sammy’s song” is Song A
			detailGuess: "2010",
		});
		await emitAck("guess:submit", {
			submissionId: s2.id,
			guessedSubmissionId: s2.id,
			detailGuess: "128",
		});
		await emitAck("guess:submit", {
			submissionId: s3.id,
			guessedSubmissionId: s3.id,
			detailGuess: "123",
		});

		await emitAck("theme:guess", { guess: "Animals" });

		const score = await emitAck<{ scoreboard: any }>("score:compute");
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
