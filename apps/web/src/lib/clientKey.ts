export const getClientKey = (): string => {
	if (typeof window === "undefined") return "server-render";
	const key = localStorage.getItem("gts2_clientKey");
	if (key) return key;
	const newKey =
		(globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2)) + "-" + Date.now();
	localStorage.setItem("gts2_clientKey", newKey);
	return newKey;
};
