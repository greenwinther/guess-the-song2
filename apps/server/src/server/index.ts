// src/server/index.ts
import http from "http";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket.js";
import { gcAndPersist, loadRoomsFromDisk, persistRoomsToDisk } from "./persistence.js";

(async () => {
	await loadRoomsFromDisk();

	const httpServer = http.createServer((req, res) => {
		if (req.method === "GET" && req.url === "/") {
			res.writeHead(200, { "Content-Type": "text/plain" });
			res.end("Guess the Song 2 realtime server");
		} else {
			res.writeHead(404);
			res.end();
		}
	});

	const io = new Server(httpServer, {
		cors: { origin: "*", methods: ["GET", "POST"] },
	});
	registerSocketHandlers(io);

	// GC + persist every 60s
	setInterval(() => {
		gcAndPersist();
	}, 60_000);

	const PORT = process.env.PORT || 8080;
	httpServer.listen(PORT, () => console.log(`Socket server on :${PORT}`));

	function onExit(signal: string) {
		console.log(`[server] ${signal} → persisting rooms...`);
		persistRoomsToDisk().finally(() => process.exit(0));
	}
	process.on("SIGINT", () => onExit("SIGINT"));
	process.on("SIGTERM", () => onExit("SIGTERM"));
})();
