// Extract a YouTube video id from common URL formats
export const getYouTubeID = (url: string): string | null => {
	try {
		const u = new URL(url);
		// youtu.be/<id>
		if (u.hostname.includes("youtu.be")) {
			return u.pathname.slice(1) || null;
		}
		// youtube.com/watch?v=<id>
		if (u.searchParams.has("v")) {
			return u.searchParams.get("v");
		}
		// youtube.com/embed/<id> or /shorts/<id>
		const parts = u.pathname.split("/").filter(Boolean);
		if (parts[0] === "embed" || parts[0] === "shorts") return parts[1] || null;
		return null;
	} catch {
		return null;
	}
};
