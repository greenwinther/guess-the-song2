// Supports PT#M#S, PT#S, PT#M, PT#H#M#S (hour part is optional)
export function isoDurationToSeconds(iso?: string | null): number | null {
	if (!iso) return null;
	const m = iso.match(/^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?$/i);
	if (!m) return null;
	const [_, h, mm, s] = m;
	const hours = Number(h ?? 0);
	const mins = Number(mm ?? 0);
	const secs = Number(s ?? 0);
	return hours * 3600 + mins * 60 + secs;
}
