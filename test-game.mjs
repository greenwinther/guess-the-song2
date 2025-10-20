import { io } from "socket.io-client";

const SERVER = "http://localhost:3001";

// helper to turn socket.emit into a Promise with ack callback
function emitAsync(socket, event, payload) {
	return new Promise((resolve) => {
		socket.emit(event, payload, (res) => resolve({ event, res }));
	});
}

const s = io(SERVER, { transports: ["websocket"] });

s.on("connect", async () => {
	console.log("connected", s.id);

	try {
		// 1) Create a room
		const create = await emitAsync(s, "room:create", { theme: "Animals" });
		if (!create.res?.ok) throw new Error("room:create failed");
		const code = create.res.room.code;
		console.log("room code:", code);

		// 2) Join as host/player
		const join = await emitAsync(s, "room:join", {
			code,
			displayName: "Host Dennis",
			clientKey: "uuid-host-123456",
			hardcore: false,
		});
		if (!join.res?.ok) throw new Error("room:join failed");
		const memberId = join.res.member.id;

		// 3) Listen to broadcasts (so you can see background/phase updates)
		s.on("room:update", (msg) => console.log("[broadcast] room:update", msg));
		s.on("playlist:item-added", (msg) => console.log("[broadcast] item-added", msg.playlistItem));
		s.on("playlist:started", (msg) => console.log("[broadcast] started", msg));

		// 4) Add a couple of songs (pretend they came from your YouTube search)
		const songs = [
			{
				submitterName: "Dennis",
				url: "https://www.youtube.com/watch?v=_ovdm2yX4MA",
				title: "Avicii - Levels",
				thumbnailUrl: "https://i.ytimg.com/vi/_ovdm2yX4MA/hqdefault.jpg",
				provider: "youtube",
				externalId: "_ovdm2yX4MA",
				durationIso: "PT3M19S",
			},
			{
				submitterName: "Alice",
				url: "https://www.youtube.com/watch?v=OPf0YbXqDm0",
				title: "Mark Ronson - Uptown Funk",
				thumbnailUrl: "https://i.ytimg.com/vi/OPf0YbXqDm0/hqdefault.jpg",
				provider: "youtube",
				externalId: "OPf0YbXqDm0",
				durationIso: "PT4M31S",
			},
		];

		for (const song of songs) {
			const add = await emitAsync(s, "submission:add", {
				roomCode: code,
				addedByMemberId: memberId,
				...song,
			});
			if (!add.res?.ok) throw new Error("submission:add failed: " + add.res?.error);
			console.log("added:", add.res.playlistItem);
		}

		// 5) Start the game
		const start = await emitAsync(s, "game:start", { roomCode: code });
		console.log("game:start ->", start.res);
		if (!start.res?.ok) throw new Error("game:start failed");

		// 6) Advance to next songs (twice to hit RECAP on the 2nd next)
		const next1 = await emitAsync(s, "song:next", { roomCode: code });
		console.log("song:next #1 ->", next1.res);

		const next2 = await emitAsync(s, "song:next", { roomCode: code });
		console.log("song:next #2 ->", next2.res);
	} catch (e) {
		console.error("TEST ERROR:", e.message);
	} finally {
		// leave a little time to see broadcasts, then exit
		setTimeout(() => process.exit(0), 500);
	}
});
