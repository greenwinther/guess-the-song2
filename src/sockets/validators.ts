import { z } from "zod";

export const createRoomSchema = z.object({
	theme: z.string().trim().min(1).optional(),
	themeHint: z.string().trim().optional(),
	backgroundUrl: z.string().url().optional(),
});

export const joinRoomSchema = z.object({
	code: z.string().trim().min(4),
	displayName: z.string().trim().min(1).max(64),
	clientKey: z.string().trim().min(8), // UUID from localStorage
	hardcore: z.boolean().optional().default(false),
});
