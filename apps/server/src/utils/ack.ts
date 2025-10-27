// Small helpers so every handler can ack safely & consistently.

export type Ack<T = any> = (response: T) => void;

export interface StdOk {
	ok: true;
}
export interface StdErr {
	ok: false;
	error: string;
	details?: unknown;
}
export type StdResp<T extends object = {}> = (StdOk & T) | StdErr;

/** Wraps an optional ack so multiple calls or exceptions won’t crash the server. */
export function safeAck<T = any>(ack?: Ack<T>) {
	let called = false;
	return (payload: T) => {
		if (called) return;
		called = true;
		try {
			ack?.(payload);
		} catch {
			/* swallow */
		}
	};
}

/** Ack success with optional extra payload. */
export function ackOk<T extends object = {}>(ack?: Ack<StdResp<T>>, extra?: T) {
	safeAck(ack)({ ok: true, ...(extra as T) });
}

/** Ack error with a short code and optional details. */
export function ackErr(ack?: Ack<StdResp>, error = "ERROR", details?: unknown) {
	safeAck(ack)({ ok: false, error, details });
}
