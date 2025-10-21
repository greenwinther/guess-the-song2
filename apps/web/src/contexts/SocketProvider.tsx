"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";
import type { Socket } from "socket.io-client";
import { getSocket } from "@/lib/socket";

const SocketContext = createContext<Socket | null>(null);

export const useSocket = () => {
	const ctx = useContext(SocketContext);
	if (!ctx) throw new Error("useSocket must be used within <SocketProvider>");
	return ctx;
};

export default function SocketProvider({ children }: { children: React.ReactNode }) {
	const [socket, setSocket] = useState<Socket | null>(null);

	useEffect(() => {
		const s = getSocket();
		const onConnect = () => console.log("[socket] connected", s.id);
		const onDisconnect = () => console.log("[socket] disconnected");

		s.on("connect", onConnect);
		s.on("disconnect", onDisconnect);
		setSocket(s);

		return () => {
			s.off("connect", onConnect);
			s.off("disconnect", onDisconnect);
			// keep the singleton alive between route changes
		};
	}, []);

	const value = useMemo(() => socket, [socket]);

	if (!value) return null; // or a loader
	return <SocketContext.Provider value={value}>{children}</SocketContext.Provider>;
}
