"use client";

import { useEffect, useMemo, useState } from "react";
import { useSocket } from "@/contexts/SocketProvider";
import { useParams } from "next/navigation";
import { getClientKey } from "@/lib/clientKey";
import SongSubmitForm from "@/components/SongSubmitForm";
import PlaylistList from "@/components/PlaylistList";
import type { PlaylistItem } from "@/types/playlist";

type Phase = "LOBBY" | "GUESSING" | "RECAP";
type Member = { id: number; displayName: string; role: string; hardcore: boolean };

export default function HostLobbyPage() {
	const { roomCode } = useParams<{ roomCode: string }>();
	const code = String(roomCode).toUpperCase();
	const socket = useSocket();

	const [phase, setPhase] = useState<Phase>("LOBBY");
	const [currentIndex, setCurrentIndex] = useState<number>(0);
	const [members, setMembers] = useState<Member[]>([]);
	const [playlist, setPlaylist] = useState<PlaylistItem[]>([]);
	const [error, setError] = useState<string | null>(null);

	// submitterId -> name (we use this to label new items coming in via playlist:item-added)
	const [submitterNameById, setSubmitterNameById] = useState<Record<number, string>>({});

	// 1) Join as HOST
	useEffect(() => {
		socket.emit(
			"room:join",
			{
				code,
				displayName: "Host",
				role: "HOST",
				hardcore: false,
				clientKey: getClientKey(),
			},
			(res: any) => {
				if (!res?.ok) setError(res?.message || "Failed to join as host");
			}
		);

		const onRoomUpdate = (p: any) => {
			if (typeof p?.currentIndex === "number") setCurrentIndex(p.currentIndex);
			if (p?.phase) setPhase(p.phase);
			if (Array.isArray(p?.members)) setMembers(p.members);
			// If you ever decide to include a host-safe playlist in room:update, you can set it here.
		};

		socket.on("room:update", onRoomUpdate);
		return () => {
			socket.off("room:update", onRoomUpdate);
		};
	}, [code, socket]);

	// 2) Initial load: use reveal:recap to build playlist + submitter map
	useEffect(() => {
		socket.emit("reveal:recap", { code }, (res: any) => {
			if (!res?.ok) return; // recap might only be available in certain phases; ignore if not ok

			// Map recap payload → our PlaylistItem shape
			// Expect something like res.playlist = [{ position, submission: { id, title, thumbnailUrl, submitter: { id, name } } }, ...]
			const items: PlaylistItem[] = (res.playlist ?? []).map((row: any) => ({
				id: row.playlistItemId ?? row.id ?? row.submission?.id, // be defensive
				position: Number(row.position ?? 0),
				submissionId: row.submission?.id,
				title: row.submission?.title ?? "(Untitled)",
				thumbnailUrl: row.submission?.thumbnailUrl ?? null,
				submitterName: row.submission?.submitter?.name ?? "(Unknown)",
			}));

			// Build submitterId -> name map for later
			const subMap: Record<number, string> = {};
			(res.playlist ?? []).forEach((row: any) => {
				const sid = row.submission?.submitter?.id;
				const sname = row.submission?.submitter?.name;
				if (sid && sname) subMap[sid] = sname;
			});

			setSubmitterNameById((m) => ({ ...m, ...subMap }));
			setPlaylist(items.sort((a, b) => a.position - b.position));
			if (typeof res.currentIndex === "number") setCurrentIndex(res.currentIndex);
			if (res.phase) setPhase(res.phase as Phase);
		});
	}, [code, socket]);

	// 3) Live updates: when a new item is added, append it using the broadcast payload
	useEffect(() => {
		const onItemAdded = (p: { submission: any; playlistItem: any }) => {
			const sub = p.submission;
			const pli = p.playlistItem;

			const submitterName =
				(sub?.submitter?.name as string) ?? (submitterNameById[sub?.submitterId] as string) ?? "";

			const newItem: PlaylistItem = {
				id: pli?.id ?? sub?.id,
				position: Number(pli?.position ?? 0),
				submissionId: sub?.id,
				title: sub?.title ?? "(Untitled)",
				thumbnailUrl: sub?.thumbnailUrl ?? null,
				submitterName,
			};

			setPlaylist((prev) => [...prev, newItem].sort((a, b) => a.position - b.position));
		};

		socket.on("playlist:item-added", onItemAdded);
		return () => {
			socket.off("playlist:item-added", onItemAdded);
		};
	}, [socket, submitterNameById]);

	const startGame = () => {
		setError(null);
		socket.emit("game:start", { code }, (res: any) => {
			if (!res?.ok) setError(res?.message || "Failed to start game");
		});
	};

	const nextSong = () => {
		setError(null);
		socket.emit("song:next", { code }, (res: any) => {
			if (!res?.ok) setError(res?.message || "Failed to go next");
		});
	};

	const canAddMore = playlist.length < 20;

	return (
		<main className="min-h-dvh p-6 grid gap-6 md:grid-cols-2">
			<section className="space-y-4">
				<h1 className="text-2xl font-semibold">
					Room {code} — Phase: {phase}
				</h1>
				{error && <p className="text-red-600 text-sm">{error}</p>}

				<div className="rounded-2xl border p-4 space-y-3">
					<h2 className="text-lg font-medium">Players</h2>
					<ul className="grid gap-2">
						{members.map((m) => (
							<li key={m.id} className="rounded-xl border px-3 py-2">
								{m.displayName} {m.hardcore ? "(Hardcore)" : ""}
							</li>
						))}
					</ul>
				</div>

				<div className="rounded-2xl border p-4 space-y-3">
					<h2 className="text-lg font-medium">Controls</h2>
					<div className="flex gap-2 flex-wrap">
						<button className="rounded-xl border px-4 py-2 hover:bg-black/5" onClick={startGame}>
							Start Game
						</button>
						<button className="rounded-xl border px-4 py-2 hover:bg-black/5" onClick={nextSong}>
							Next Song
						</button>
					</div>
				</div>
			</section>

			<section className="space-y-4">
				{/* Song submit (search or paste URL) */}
				<SongSubmitForm
					className="rounded-2xl border p-4"
					code={code}
					defaultSubmitter=""
					onAdded={() => {
						// no-op; we rely on playlist:item-added broadcast
					}}
				/>

				{/* Playlist */}
				<PlaylistList items={playlist} currentIndex={currentIndex} showSubmitter={true} />
			</section>
		</main>
	);
}
