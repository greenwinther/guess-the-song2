import { io } from "socket.io-client";

const s = io("http://localhost:3001", { transports: ["websocket"] });

s.on("connect", () => {
	console.log("connected", s.id);

	s.emit("room:create", { theme: "Animals" }, (res) => {
		console.log("create:", res);

		if (!res?.ok) return process.exit(1);
		const code = res.room.code;

		s.emit(
			"room:join",
			{ code, displayName: "Dennis", clientKey: "uuid-12345678", hardcore: false },
			(res2) => {
				console.log("join:", res2);
				process.exit(0);
			}
		);
	});
});

s.emit(
	"submission:add",
	{
		roomCode: code,
		submitterName: "Dennis",
		url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
		title: "Never Gonna Give You Up",
		thumbnailUrl: "https://i.ytimg.com/vi/dQw4w9WgXcQ/hqdefault.jpg",
		provider: "youtube",
		externalId: "dQw4w9WgXcQ",
		addedByMemberId: res2.member.id,
	},
	(res3) => {
		console.log("submission:add:", res3);
		process.exit(0);
	}
);
