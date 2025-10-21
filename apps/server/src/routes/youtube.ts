import { Router, Request, Response } from "express";

const router: ReturnType<typeof Router> = Router();

// GET /search?q=...
router.get("/search", async (req: Request, res: Response) => {
	const q = String(req.query.q ?? "").trim();
	if (!q) return res.status(400).json({ ok: false, error: "MISSING_QUERY" });

	const key = process.env.YOUTUBE_API_KEY;
	if (!key) return res.status(500).json({ ok: false, error: "MISSING_API_KEY" });

	try {
		// 1️⃣ initial search
		const searchUrl = new URL("https://www.googleapis.com/youtube/v3/search");
		searchUrl.searchParams.set("part", "snippet");
		searchUrl.searchParams.set("type", "video");
		searchUrl.searchParams.set("maxResults", "10");
		searchUrl.searchParams.set("q", q);
		searchUrl.searchParams.set("key", key);

		const sResp = await fetch(searchUrl);
		const sJson = await sResp.json();
		const ids = (sJson.items ?? []).map((it: any) => it.id?.videoId).filter(Boolean);

		// 2️⃣ fetch category + duration
		const metaMap: Record<string, { duration: string; categoryId: string }> = {};
		if (ids.length) {
			const videosUrl = new URL("https://www.googleapis.com/youtube/v3/videos");
			videosUrl.searchParams.set("part", "contentDetails,snippet");
			videosUrl.searchParams.set("id", ids.join(","));
			videosUrl.searchParams.set("key", key);
			const vResp = await fetch(videosUrl);
			const vJson = await vResp.json();
			for (const v of vJson.items ?? []) {
				metaMap[v.id] = {
					duration: v.contentDetails?.duration ?? "",
					categoryId: v.snippet?.categoryId ?? "",
				};
			}
		}

		// 3️⃣ filter to music (categoryId === "10")
		const results = (sJson.items ?? [])
			.map((it: any) => {
				const vid = it.id?.videoId;
				const meta = metaMap[vid] ?? {};
				return {
					videoId: vid,
					title: it.snippet?.title,
					channelTitle: it.snippet?.channelTitle,
					thumbnailUrl: it.snippet?.thumbnails?.high?.url || it.snippet?.thumbnails?.medium?.url,
					durationIso: meta.duration,
					provider: "youtube",
					url: vid ? `https://www.youtube.com/watch?v=${vid}` : undefined,
					categoryId: meta.categoryId,
				};
			})
			.filter((r: any) => r.videoId && r.url && r.categoryId === "10");

		res.json({ ok: true, results });
	} catch (e: any) {
		res.status(500).json({ ok: false, error: e?.message ?? "YT_SEARCH_FAILED" });
	}
});

export default router;
