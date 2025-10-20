// src/utils/text.ts
export function normalize(s?: string | null) {
	return (s ?? "")
		.toLowerCase()
		.normalize("NFKD")
		.replace(/[\u0300-\u036f]/g, "") // strip accents
		.replace(/\s+/g, " ")
		.trim();
}
