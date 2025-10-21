"use client";

import { useSocket } from "@/contexts/SocketProvider";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function JoinPage() {
	const socket = useSocket();
	const router = useRouter();
	const [code, setCode] = useState("");
	const [name, setName] = useState("");
	const [hardcore, setHardcore] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const onJoin = () => {
		setError(null);
		socket.emit("room:join", { code, displayName: name, role: "PLAYER", hardcore }, (res: any) => {
			if (!res?.ok) {
				setError(res?.message || "Failed to join");
				return;
			}
			router.push(`/game/${code}`);
		});
	};

	return (
		<main className="min-h-dvh grid place-items-center p-6">
			<div className="w-full max-w-md space-y-4">
				<h1 className="text-2xl font-semibold">Join a Room</h1>

				<input
					className="w-full rounded-xl border px-3 py-2"
					placeholder="Room code (e.g. ABCD)"
					value={code}
					onChange={(e) => setCode(e.target.value.toUpperCase())}
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

				<button className="w-full rounded-xl border px-4 py-3 hover:bg-black/5" onClick={onJoin}>
					Join
				</button>

				{error && <p className="text-red-600 text-sm">{error}</p>}
			</div>
		</main>
	);
}
