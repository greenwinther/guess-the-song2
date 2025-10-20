import { z } from "zod";

const Env = z.object({
	DATABASE_URL: z.string().url(),
	CORS_ORIGIN: z.string().optional(),
	PGSSL: z.string().optional(), // "true" or undefined
	PORT: z.coerce.number().default(3001),
});

export const env = Env.parse(process.env);

export const corsOrigins = env.CORS_ORIGIN ? env.CORS_ORIGIN.split(",").map((s) => s.trim()) : ["*"];

export const useSsl = (env.PGSSL ?? "").toLowerCase() === "true" ? { rejectUnauthorized: false } : undefined;
