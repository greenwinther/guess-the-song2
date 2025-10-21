"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { getYouTubeID } from "@/lib/youtube";
import { withAck } from "@/lib/withAck";
import { useSocket } from "@/contexts/SocketProvider";
import { YouTubeSearchItem } from "@/types/youtube";
import { debounce } from "@/lib/debounce";

type Props = {
	code: string;
	defaultSubmitter?: string;
	onAdded?: () => void; // optional callback after a successful add
	className?: string;
};

export default function SongSubmitForm({ code, defaultSubmitter = "", onAdded, className }: Props) {
	const socket = useSocket();
	const pickedItemRef = useRef<YouTubeSearchItem | null>(null);
	const justPickedRef = useRef(false);

	// inputs
	const [searchOrUrl, setSearchOrUrl] = useState("");
	const [submitter, setSubmitter] = useState(defaultSubmitter);

	// search
	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState<YouTubeSearchItem[]>([]);
	const [error, setError] = useState<string | null>(null);

	const doSearch = useMemo(
		() =>
			debounce(async (q: string) => {
				if (!q) {
					setResults([]);
					return;
				}
				try {
					setLoading(true);
					setError(null);
					const base = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";
					const r = await fetch(`${base}/youtube/search?q=${encodeURIComponent(q)}`);
					if (!r.ok) throw new Error(`Search failed: ${r.status}`);
					const json = await r.json();
					// server returns { ok, results }
					if (!json?.ok) throw new Error("YouTube proxy error");
					setResults(json.results || []);
				} catch (e: any) {
					setError(e?.message ?? "Search failed");
					setResults([]);
				} finally {
					setLoading(false);
				}
			}, 400),
		[]
	);

	// as user types, decide whether to search or treat as URL
	useEffect(() => {
		if (!searchOrUrl) {
			setResults([]);
			setError(null);
			return;
		}
		// If we just picked from the dropdown, *don’t* re-trigger a search.
		if (justPickedRef.current) {
			justPickedRef.current = false;
			return;
		}
		if (/youtu/i.test(searchOrUrl)) {
			// looks like a URL; stop searching
			setResults([]);
			setError(null);
			return;
		}
		// looks like a query; debounce search
		doSearch(searchOrUrl.trim());
	}, [searchOrUrl, doSearch]);

	// user picks a search result -> fill both URL & label
	const pick = (item: YouTubeSearchItem) => {
		setSearchOrUrl(item.title); // show title in input
		setResults([]);
		// keep a hidden URL state by reusing item.url when submitting
		// we’ll compute the final URL in onSubmit using either detect URL or the picked url
		pickedItemRef.current = item;
		justPickedRef.current = true;
	};

	// submit to backend via socket
	const onSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setError(null);

		const submitterName = submitter.trim();
		if (!submitterName) {
			setError("Enter a submitter name.");
			return;
		}

		// resolve final URL:
		// 1) if input contains a youtube URL, use it
		// 2) else if user picked from search, use selectedUrlRef
		// 3) else nothing to add
		let finalUrl: string | null = null;
		let payloadExtras: Partial<{
			title: string;
			thumbnailUrl: string;
			provider: string;
			externalId: string;
			durationIso: string;
		}> = {};

		// Case 1: pasted a YouTube URL
		if (/youtu/i.test(searchOrUrl)) {
			finalUrl = searchOrUrl.trim();
			const vid = getYouTubeID(finalUrl);
			if (!vid) {
				setError("Invalid YouTube URL");
				return;
			}
			// optional: you could fetch metadata here, but it's not required
			payloadExtras = { provider: "youtube", externalId: vid };
		} // Case 2: picked a search result
		else if (pickedItemRef.current) {
			const it = pickedItemRef.current;
			finalUrl = it.url;
			payloadExtras = {
				title: it.title,
				thumbnailUrl: it.thumbnailUrl,
				provider: "youtube",
				externalId: it.videoId,
				durationIso: it.durationIso,
			};
		}

		if (!finalUrl) {
			setError("Type a search and pick a result, or paste a YouTube URL.");
			return;
		}
		if (!submitter.trim()) {
			setError("Enter a submitter name.");
			return;
		}

		// Your backend’s event is `submission:add`
		// Most natural shape is { code, url, submitterName }
		// If your server currently only accepts { code, url }, it will ignore the extra field.
		// ✅ send roomCode (not code) + submitterName + url + extras
		const ack = await withAck<any>((cb) =>
			socket.emit(
				"submission:add",
				{
					roomCode: code, // <-- IMPORTANT: server expects 'roomCode'
					submitterName,
					url: finalUrl,
					...payloadExtras,
				},
				cb
			)
		);

		if (!ack?.ok) {
			setError(ack?.message || "Failed to add song");
			return;
		}

		// reset UI
		setSearchOrUrl("");
		setResults([]);
		pickedItemRef.current = null;
		setSubmitter(defaultSubmitter);
		if (onAdded) onAdded();
	};

	return (
		<form onSubmit={onSubmit} className={`relative grid gap-2 ${className ?? ""}`}>
			<div className="grid gap-2 md:grid-cols-[2fr_1fr_auto]">
				{/* Search or URL */}
				<input
					className="rounded-xl border px-3 py-2"
					placeholder="Search or paste YouTube URL"
					value={searchOrUrl}
					onChange={(e) => {
						setSearchOrUrl(e.target.value);
						pickedItemRef.current = null; // user is typing again; discard previous pick
						justPickedRef.current = false;
					}}
				/>

				{/* Submitter name */}
				<input
					className="rounded-xl border px-3 py-2"
					placeholder="Submitter name"
					value={submitter}
					onChange={(e) => setSubmitter(e.target.value)}
				/>

				<button className="rounded-xl border px-4 py-2 hover:bg-black/5">Add Song</button>
			</div>

			{/* Search dropdown */}
			{results.length > 0 && (
				<ul className="absolute left-0 top-full w-full z-10 mt-1 max-h-72 overflow-auto rounded-xl border bg-white/90 backdrop-blur">
					{results.map((v) => (
						<li
							key={v.videoId}
							onClick={() => pick(v)}
							className="p-2 hover:bg-black/5 cursor-pointer flex items-center gap-2"
							title={v.title}
						>
							{/* Use <img> to avoid next/image domain config for now */}
							<img
								src={v.thumbnailUrl}
								alt=""
								className="h-10 w-16 object-cover rounded"
								loading="lazy"
							/>
							<span className="text-sm line-clamp-2">{v.title}</span>
							<span className="ml-auto text-xs text-muted-foreground">{v.durationIso}</span>
						</li>
					))}
				</ul>
			)}

			{loading && <p className="text-sm text-muted-foreground">Searching…</p>}
			{error && <p className="text-sm text-red-600">{error}</p>}
		</form>
	);
}
