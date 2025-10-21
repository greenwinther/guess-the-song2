"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import type { YouTubeSearchItem } from "@/types/youtube";
import { debounce } from "@/lib/debounce";

export function useYouTubeSearch() {
	const [q, setQ] = useState("");
	const [loading, setLoading] = useState(false);
	const [results, setResults] = useState<YouTubeSearchItem[]>([]);
	const controllerRef = useRef<AbortController | null>(null);

	const search = useCallback(async (query: string) => {
		if (!query) {
			setResults([]);
			return;
		}
		try {
			controllerRef.current?.abort();
			const controller = new AbortController();
			controllerRef.current = controller;
			type SearchResponse = { ok: boolean; results: YouTubeSearchItem[] };

			setLoading(true);
			const base = process.env.NEXT_PUBLIC_SERVER_URL || "http://localhost:4000";
			const res = await fetch(`${base}/youtube/search?q=${encodeURIComponent(query)}`, {
				signal: controller.signal,
			});
			if (!res.ok) throw new Error(`Search failed: ${res.status}`);
			const data = (await res.json()) as SearchResponse;
			setResults(data.results ?? []);
		} catch (err) {
			if ((err as any)?.name !== "AbortError") {
				console.error("[useYouTubeSearch]", err);
			}
		} finally {
			setLoading(false);
		}
	}, []);

	const debounced = useMemo(() => debounce(search, 400), [search]);

	const setQuery = (val: string) => {
		setQ(val);
		debounced(val.trim());
	};

	return { q, setQuery, loading, results, reset: () => setResults([]) };
}
