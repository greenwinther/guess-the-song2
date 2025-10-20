import type { Request, Response, NextFunction } from "express";

type Bucket = { count: number; resetAt: number };
const buckets = new Map<string, Bucket>();

export function rateLimit({ limit, windowMs }: { limit: number; windowMs: number }) {
	return (req: Request, res: Response, next: NextFunction) => {
		const ip = req.ip || req.headers["x-forwarded-for"]?.toString() || "unknown";
		const now = Date.now();
		const bucket = buckets.get(ip);

		if (!bucket || now > bucket.resetAt) {
			buckets.set(ip, { count: 1, resetAt: now + windowMs });
			return next();
		}

		if (bucket.count < limit) {
			bucket.count++;
			return next();
		}

		res.status(429).json({ ok: false, error: "RATE_LIMITED", retryAfterMs: bucket.resetAt - now });
	};
}
