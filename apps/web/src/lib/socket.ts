"use client";

import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

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
