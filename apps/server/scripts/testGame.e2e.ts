// apps/server/scripts/testGame.e2e.ts npm --workspace apps/server run test:e2e
import assert from "node:assert/strict";
import { io } from "socket.io-client";

const URL = process.env.SERVER_URL || "http://127.0.0.1:8080";
const socket = io(URL, { reconnectionAttempts: 2, timeout: 5000 });

const emitAck = <T = any>(event: string, payload?: any, ms = 5000) =>
	new Promise<T>((resolve, reject) => {
		const t = setTimeout(() => reject({ ok: false, error: `ACK_TIMEOUT:${event}` }), ms);
		socket.emit(event, payload ?? {}, (resp: any) => {
			clearTimeout(t);
			if (resp?.ok === false) return reject(resp);
			resolve(resp as T);
		});
	});

socket.on("connect", async () => {
	try {
		const join = await emitAck<{ memberId: string; room: any }>("room:join", {
			code: "ABCD",
			name: "Tester",
		});
		await emitAck("submission:add", {
			id: "1",
			title: "Song A",
			videoId: "a1",
			submitterName: "Sammy",
			detailHint: "Y",
			detail: "2010",
		});
		await emitAck("submission:add", {
			id: "2",
			title: "Song B",
			videoId: "b2",
			submitterName: "Alex",
			detailHint: "B",
			detail: "128",
		});
		await emitAck("theme:set", { theme: "Animals", hints: ["mammal"] });
		await emitAck("game:setPhase", { phase: "GUESSING" });
		await emitAck("game:setIndex", { currentIndex: 0 });
		await emitAck("guess:submit", { submissionId: "1", guessedSubmissionId: "1", detailGuess: "2010" });
		await emitAck("guess:submit", { submissionId: "2", guessedSubmissionId: "2", detailGuess: "128" });
		await emitAck("theme:guess", { guess: "Animals" });
		const { scoreboard } = await emitAck<{ scoreboard: any }>("score:compute");

		const my = scoreboard.ranked[0];
		assert(my.total >= 5, "should have at least base test points");

		console.log("✅ e2e passed:", scoreboard);
	} catch (e) {
		console.error("❌ e2e failed:", e);
		process.exit(1);
	} finally {
		process.exit(0);
	}
});
