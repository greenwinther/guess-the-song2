import "dotenv/config";
import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { corsOrigins } from "./config/env";
import health from "./routes/health";
import { registerSockets } from "./sockets/core";
import youtube from "./routes/youtube";
import { rateLimit } from "./middleware/rateLimit";
import cleanupRoutes from "./routes/cleanup";

const app = express();
app.use(cors({ origin: corsOrigins }));
app.use(express.json());

app.get("/", (_req, res) => res.send("Guess-the-Song server running"));
app.use(health);
app.use("/youtube", rateLimit({ limit: 5, windowMs: 10_000 }));
app.use(youtube);
app.use(cleanupRoutes);

const server = http.createServer(app);
const io = new Server(server, { cors: { origin: corsOrigins } });
registerSockets(io);

const PORT = Number(process.env.PORT ?? 3001);
server.listen(PORT, () => console.log(`Server listening on :${PORT}`));
