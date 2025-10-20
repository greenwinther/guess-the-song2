export class HttpError extends Error {
	/** HTTP status code (e.g. 404, 400, 500) */
	status: number;

	/** Short error type / code (e.g. "NOT_FOUND", "VALIDATION_ERROR") */
	type: string;

	/** Optional extra details (for validation errors, etc.) */
	details?: unknown;

	constructor(status: number, message: string, type = "ERROR", details?: unknown) {
		super(message);
		this.name = "HttpError";
		this.status = status;
		this.type = type;
		this.details = details;

		// Fix prototype chain for proper instanceof checks
		Object.setPrototypeOf(this, new.target.prototype);

		// Trim stack traces (Node ≥ 16)
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, HttpError);
		}
	}
}

/**
 * Helper to convert unknown errors into HttpError instances
 */
export function toHttpError(err: unknown, fallbackStatus = 500): HttpError {
	if (err instanceof HttpError) return err;
	if (err instanceof Error) return new HttpError(fallbackStatus, err.message);
	return new HttpError(fallbackStatus, "Unknown error");
}

/**
 * Express middleware for unified error responses
 */
export function errorMiddleware(err: unknown, _req: any, res: any, _next: any) {
	const e = toHttpError(err);
	res.status(e.status).json({
		ok: false,
		error: e.type,
		message: e.message,
		details: e.details ?? null,
	});
}
