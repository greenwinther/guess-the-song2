"use client";

import Link from "next/link";

export default function HomePage() {
	return (
		<main className="min-h-dvh grid place-items-center p-6">
			<div className="w-full max-w-md space-y-4">
				<h1 className="text-2xl font-semibold">Guess the Song 2</h1>
				<div className="grid gap-3">
					<Link href="/host-room" className="rounded-xl border px-4 py-3 hover:bg-black/5">
						Create / Host a Room
					</Link>
					<Link href="/join" className="rounded-xl border px-4 py-3 hover:bg-black/5">
						Join a Room
					</Link>
				</div>
			</div>
		</main>
	);
}
