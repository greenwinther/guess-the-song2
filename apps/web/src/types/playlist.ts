export type PlaylistItem = {
	id: number;
	position: number; // 0-based or 1-based; we’ll just display +1
	submissionId: number;
	title: string;
	thumbnailUrl: string | null;
	submitterName: string; // server should include this in host-safe payload
};
