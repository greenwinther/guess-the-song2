"use client";

import { useSocket } from "@/contexts/SocketProvider";
import { useState } from "react";
import { useRouter } from "next/navigation";

export default function HostRoomPage() {
	const socket = useSocket();
	const router = useRouter();
	const [creating, setCreating] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const handleCreate = () => {
		setCreating(true);
		setError(null);

		// Your backend expects `room:create`
		socket.emit("room:create", {}, (res: any) => {
			setCreating(false);
			if (!res?.ok) {
				setError(res?.message || "Failed to create room");
				return;
			}
			// response should include room code or id; assuming { room: { code } }
			const code = res.room?.code;
			if (!code) {
				setError("Missing room code in response");
				return;
			}
			router.push(`/host-room/${code}`);
		});
	};

	return (
		<main className="min-h-dvh grid place-items-center p-6">
			<div className="w-full max-w-md space-y-4">
				<h1 className="text-2xl font-semibold">Host a Room</h1>
				<button
					className="w-full rounded-xl border px-4 py-3 hover:bg-black/5 disabled:opacity-60"
					onClick={handleCreate}
					disabled={creating}
				>
					{creating ? "Creating..." : "Create Room"}
				</button>
				{error && <p className="text-red-600 text-sm">{error}</p>}
			</div>
		</main>
	);
}
