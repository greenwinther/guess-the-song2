export const withAck = <T = any>(emit: (cb: (res: T) => void) => void) =>
	new Promise<T>((resolve) => emit((res) => resolve(res)));
