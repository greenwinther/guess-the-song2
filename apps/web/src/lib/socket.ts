"use client";

import { io, Socket } from "socket.io-client";
import type { ServerToClientEvents, ClientToServerEvents } from "@guess-the-song2/shared";

let socket: Socket<ServerToClientEvents, ClientToServerEvents> | null = null;

export const getSocket = () => {
	if (!socket) {
		const url = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:3000";
		socket = io(url, {
			transports: ["websocket"],
			autoConnect: true,
		});
	}
	return socket;
};
