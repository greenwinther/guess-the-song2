"use client";

import { useParams } from "next/navigation";
import { useSocket } from "@/contexts/SocketProvider";
import { useEffect, useState } from "react";

export default function GamePage() {
	const { roomCode } = useParams<{ roomCode: string }>();
	const socket = useSocket();
	const [currentIndex, setCurrentIndex] = useState<number>(0);
	const [phase, setPhase] = useState<"LOBBY" | "GUESSING" | "RECAP">("LOBBY");

	useEffect(() => {
		// backend should emit room:update with phase/currentIndex
		const onRoomUpdate = (p: any) => {
			if (typeof p?.currentIndex === "number") setCurrentIndex(p.currentIndex);
			if (p?.phase) setPhase(p.phase);
		};

		socket.on("room:update", onRoomUpdate);
		return () => {
			socket.off("room:update", onRoomUpdate);
		};
	}, [socket]);

	const lockGuess = () => {
		// example; you’ll wire real payloads (playlistItemId, guessedSubmitterId)
		socket.emit("guess:lock", { code: roomCode }, () => {});
	};

	return (
		<main className="min-h-dvh p-6 space-y-4">
			<h1 className="text-2xl font-semibold">Room {roomCode}</h1>
			<p>Phase: {phase}</p>
			<p>Song index: {currentIndex}</p>
		</main>
	);
}
