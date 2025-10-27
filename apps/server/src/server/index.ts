// src/server/index.ts
import http from "http";
import { Server } from "socket.io";
import { registerSocketHandlers } from "./socket";

const httpServer = http.createServer((req, res) => {
	if (req.method === "GET" && req.url === "/") {
		res.writeHead(200, { "Content-Type": "text/plain" });
		res.end("Guess the Song 2 realtime server");
		return;
	}
	res.writeHead(404);
	res.end();
});

const io = new Server(httpServer, { cors: { origin: "*" } });
registerSocketHandlers(io);

const PORT = process.env.PORT || 8080;
httpServer.listen(PORT, () => console.log(`Socket server on :${PORT}`));
