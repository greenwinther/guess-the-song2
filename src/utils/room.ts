export function makeRoomCode(len = 4) {
	const chars = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";
	let out = "";
	for (let i = 0; i < len; i++) out += chars[Math.floor(Math.random() * chars.length)];
	return out;
}

export function ttl(hours: number) {
	const d = new Date();
	d.setHours(d.getHours() + hours);
	return d;
}
