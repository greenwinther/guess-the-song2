// apps/server/scripts/devClient.ts
import { io } from "socket.io-client";

const URL = process.env.SERVER_URL || "http://127.0.0.1:8080"; // 127.0.0.1 avoids some IPv6 quirks
console.log("[client] connecting to", URL);

const socket = io(URL, {
	// don't force websocket; let it negotiate (polling → websocket)
	reconnectionAttempts: 5,
	timeout: 5000,
});

socket.on("connect", () => {
	console.log("[client] connected as", socket.id);

	socket.emit("room:join", { code: "ABCD", name: "Dennis" }, (resp: any) => {
		console.log("[client] join ack:", resp);

		socket.emit("guess:submit", { submissionId: "yt123", guessedSubmitterName: "Sammy" }, (g: any) => {
			console.log("[client] guess ack:", g);

			socket.emit("score:compute", (s: any) => {
				console.log("[client] score ack:", s);
				process.exit(0);
			});
		});

		socket.emit("theme:set", { theme: "Animals", hints: ["mammal", "nocturnal"] }, (r: any) => {
			console.log("[client] theme:set", r);
			socket.emit("theme:guess", { guess: "Animals" }, (r2: any) => {
				console.log("[client] theme:guess", r2);
				socket.emit("theme:reveal", {}, (r3: any) => {
					console.log("[client] theme:reveal", r3);
					process.exit(0);
				});
			});
		});
	});
});

socket.on("connect_error", (err) => console.error("[client] connect_error:", err.message));
socket.on("reconnect_failed", () => {
	console.error("[client] reconnect_failed");
	process.exit(1);
});

setTimeout(() => {
	console.error("[client] timeout waiting for server");
	process.exit(1);
}, 15000);
