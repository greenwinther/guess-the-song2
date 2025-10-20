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

		const save = await emitAsync(s, "room:save", { roomCode: code });
		console.log("room:save ->", save.res);

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

		// ... after you join and before game:start
		const submitterIds = [];

		for (const song of songs) {
			const add = await emitAsync(s, "submission:add", {
				roomCode: code,
				addedByMemberId: memberId,
				...song,
			});
			if (!add.res?.ok) throw new Error("submission:add failed: " + add.res?.error);
			console.log("added:", add.res.playlistItem);
			submitterIds.push(add.res.submitterId); // <— keep the valid submitterId for this room
		}

		// start game
		const start = await emitAsync(s, "game:start", { roomCode: code });
		console.log("game:start ->", start.res);

		if (!start.res?.ok) throw new Error("game:start failed");

		// upsert a guess for the first item using a real submitterId
		const firstItemId = start.res.playlistItemId;
		const upsert = await emitAsync(s, "guess:upsert", {
			roomCode: code,
			playlistItemId: firstItemId,
			guesserId: memberId,
			guessedSubmitterId: submitterIds[0], // <— valid ID
		});
		console.log("guess:upsert ->", upsert.res);

		// now locking will succeed
		const lock = await emitAsync(s, "guess:lock", {
			roomCode: code,
			playlistItemId: firstItemId,
			guesserId: memberId,
		});
		console.log("guess:lock ->", lock.res);

		// 6) Advance to next songs (twice to hit RECAP on the 2nd next)
		const next1 = await emitAsync(s, "song:next", { roomCode: code });
		console.log("song:next #1 ->", next1.res);

		// lock a theme attempt that matches (your room theme is "Animals" in the test)
		const themeUpsert = await emitAsync(s, "themeAttempt:upsert", {
			roomCode: code,
			playlistItemId: start.res.playlistItemId,
			guesserId: memberId,
			text: "Animals",
		});
		console.log("themeAttempt:upsert ->", themeUpsert.res);

		const themeLock = await emitAsync(s, "themeAttempt:lock", {
			roomCode: code,
			playlistItemId: start.res.playlistItemId,
			guesserId: memberId,
		});
		console.log("themeAttempt:lock ->", themeLock.res);

		// get scores
		const scores = await emitAsync(s, "scores:get", { roomCode: code });
		console.log("scores:get ->", scores.res);

		const reveal1 = await emitAsync(s, "reveal:nextSong", {
			roomCode: code,
			playlistItemId: firstItemId,
		});
		console.log("reveal1 ->", reveal1.res);

		const songResults = await emitAsync(s, "results:song", {
			roomCode: code,
			playlistItemId: firstItemId,
		});
		console.log("results:song ->", songResults.res);

		const playerHits = await emitAsync(s, "results:player", {
			roomCode: code,
			memberId,
		});
		console.log("results:player ->", playerHits.res);

		const next2 = await emitAsync(s, "song:next", { roomCode: code });
		console.log("song:next #2 ->", next2.res);
	} catch (e) {
		console.error("TEST ERROR:", e.message);
	} finally {
		// leave a little time to see broadcasts, then exit
		setTimeout(() => process.exit(0), 500);
	}
});
