"use client";

import { useEffect, useState } from "react";
import { useSocket } from "@/contexts/SocketProvider";
import { useParams } from "next/navigation";
import { getClientKey } from "@/lib/clientKey";

type Member = { id: number; displayName: string; role: string; hardcore: boolean };

export default function HostLobbyPage() {
	const { roomCode } = useParams<{ roomCode: string }>();
	const socket = useSocket();
	const [members, setMembers] = useState<Member[]>([]);
	const [phase, setPhase] = useState<"LOBBY" | "GUESSING" | "RECAP">("LOBBY");
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		const payload = {
			code: String(roomCode).toUpperCase(),
			displayName: "Host",
			role: "HOST" as const,
			hardcore: false,
			clientKey: getClientKey(),
		};
		// Join as HOST (backend should create or reuse host member)
		socket.emit("room:join", payload, (res: any) => {
			if (!res?.ok) {
				console.error("room:join failed", res);
				setError(res?.message || "Failed to join as host");
			}
		});

		const onRoomUpdate = (p: any) => {
			if (p?.phase) setPhase(p.phase);
			if (Array.isArray(p?.members)) setMembers(p.members);
		};

		socket.on("room:update", onRoomUpdate);
		return () => {
			socket.off("room:update", onRoomUpdate);
		};
	}, [roomCode, socket]);

	const startGame = () => {
		socket.emit("game:start", { code: roomCode }, (res: any) => {
			if (!res?.ok) setError(res?.message || "Failed to start game");
		});
	};

	return (
		<main className="min-h-dvh p-6 space-y-4">
			<h1 className="text-2xl font-semibold">
				Room {roomCode} — Phase: {phase}
			</h1>

			{error && <p className="text-red-600 text-sm">{error}</p>}

			<section>
				<h2 className="text-lg font-medium mb-2">Players</h2>
				<ul className="grid gap-2">
					{members.map((m) => (
						<li key={m.id} className="rounded-xl border px-3 py-2">
							{m.displayName} {m.hardcore ? "(Hardcore)" : ""}
						</li>
					))}
				</ul>
			</section>

			<button className="rounded-xl border px-4 py-3 hover:bg-black/5" onClick={startGame}>
				Start Game
			</button>
		</main>
	);
}
