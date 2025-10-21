"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useSocket } from "@/contexts/SocketProvider";
import { getClientKey } from "@/lib/clientKey";

export default function HomePage() {
	const socket = useSocket();
	const router = useRouter();

	// Join form
	const [code, setCode] = useState("");
	const [name, setName] = useState("");
	const [hardcore, setHardcore] = useState(false);
	const [joining, setJoining] = useState(false);
	const [hosting, setHosting] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleJoin = () => {
		setError(null);
		const trimmed = name.trim();
		if (!code || trimmed.length < 1) {
			setError("Enter a room code and a name.");
			return;
		}
		setJoining(true);
		const payload = {
			code: code.toUpperCase(),
			displayName: trimmed,
			role: "PLAYER" as const,
			hardcore,
			clientKey: getClientKey(),
		};
		socket.emit("room:join", payload, (res: any) => {
			setJoining(false);
			if (!res?.ok) {
				setError(res?.message || "Failed to join");
				return;
			}
			router.push(`/game/${payload.code}`);
		});
	};

	const handleHost = () => {
		setHosting(true);
		setError(null);
		// 1) create room
		socket.emit("room:create", {}, (res: any) => {
			if (!res?.ok || !res?.room?.code) {
				setHosting(false);
				setError(res?.message || "Failed to create room");
				return;
			}
			const roomCode = String(res.room.code).toUpperCase();
			// 2) navigate to lobby immediately
			router.push(`/host-room/${roomCode}`);
			// 3) host page will do room:join with role=HOST + clientKey (as you already implemented)
		});
	};

	return (
		<main className="min-h-dvh grid place-items-center p-6">
			<div className="w-full max-w-md space-y-5">
				<h1 className="text-2xl font-semibold">Guess the Song 2</h1>

				<section className="space-y-3 rounded-2xl border p-4">
					<h2 className="text-lg font-medium">Join a Room</h2>
					<input
						className="w-full rounded-xl border px-3 py-2"
						placeholder="Room code (e.g. ABCD)"
						value={code}
						onChange={(e) => setCode(e.target.value.toUpperCase())}
						maxLength={4}
					/>
					<input
						className="w-full rounded-xl border px-3 py-2"
						placeholder="Your name"
						value={name}
						onChange={(e) => setName(e.target.value)}
					/>
					<label className="flex items-center gap-2 text-sm">
						<input
							type="checkbox"
							checked={hardcore}
							onChange={(e) => setHardcore(e.target.checked)}
						/>
						Hardcore
					</label>
					<button
						className="w-full rounded-xl border px-4 py-3 hover:bg-black/5 disabled:opacity-60"
						onClick={handleJoin}
						disabled={joining}
					>
						{joining ? "Joining..." : "Join"}
					</button>
				</section>

				<section className="space-y-3 rounded-2xl border p-4">
					<h2 className="text-lg font-medium">Or Host a New Room</h2>
					<button
						className="w-full rounded-xl border px-4 py-3 hover:bg-black/5 disabled:opacity-60"
						onClick={handleHost}
						disabled={hosting}
					>
						{hosting ? "Creating..." : "Host Room"}
					</button>
				</section>

				{error && <p className="text-red-600 text-sm">{error}</p>}
			</div>
		</main>
	);
}
