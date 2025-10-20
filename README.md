guess-the-song2/
├─ .env # DATABASE*URL, YOUTUBE_API_KEY, etc. (local)
├─ .env.example # sample envs (no secrets)
├─ .gitignore
├─ drizzle.config.ts # Drizzle Kit config (dialect=postgresql, schema, out)
├─ drizzle/ # SQL migrations + journal
│ ├─ 0000*\*.sql
│ └─ meta/\_journal.json
├─ package.json
├─ tsconfig.json
├─ README.md

├─ test-socket.mjs # quick room:create/join test
└─ test-game.mjs # end-to-end game flow test

src/
├─ index.ts # Express app + Socket.IO server + errorMiddleware
├─ config/
│ └─ env.ts # CORS origins, config helpers
│
├─ db/
│ ├─ db.ts # create Drizzle instance (pg)
│ ├─ schema/
│ │ ├─ rooms.ts # rooms (code, phase, currentIndex, expiresAt, isSaved...)
│ │ ├─ members.ts # room_members (role, hardcore, clientKey, guessingSeed...)
│ │ ├─ submitters.ts # submitters (unique per room by name)
│ │ ├─ submissions.ts # submissions (url, title, provider, externalId, durationSeconds...)
│ │ ├─ playlist.ts # playlist_items (position, startedAt, endedAt)
│ │ ├─ guesses.ts # guesses (unique (playlistItemId, guesserId), lockedAt, isCorrect)
│ │ ├─ theme.ts # theme_attempts + theme_progress tables
│ └─└─ scores.ts # member_scores (guessPoints, themePoints, totalPoints)
│
├─ routes/
│ ├─ health.ts # GET /health
│ ├─ youtube.ts # GET /youtube/search (music-only + duration)
│ ├─ cleanup.ts # GET/DELETE /admin/rooms/expired
│ └─ testError.ts # GET /error-test (verifies HttpError + middleware)
│
├─ sockets/
│ ├─ core.ts # registers all socket namespaces/handlers
│ ├─ room.ts # room:create, room:join
│ ├─ roomSave.ts # room:save (extend +7d)
│ ├─ submission.ts # submission:add (upsert submitter → submission → playlist append)
│ ├─ game.ts # game:start, song:next (auto-lock + timestamps + recap switch)
│ ├─ guess.ts # guess:upsert, guess:lock
│ ├─ theme.ts # themeAttempt:upsert, themeAttempt:lock (solve + points)
│ ├─ reveal.ts # reveal:nextSong (mark isCorrect + award guess points)
│ ├─ scores.ts # scores:get (and broadcast scores:updated from reveal/theme)
│ ├─ results.ts # results:song, results:player (drill-down views)
| ├─ validation # validation
│ └─ recap.ts # reveal:recap (full playlist summary)
│
├─ services/
│ ├─ room.ts # createRoomService, joinRoomService
│ ├─ roomSave.ts # saveRoomService
│ ├─ submission.ts # addSubmissionService (txn + MAX_PLAYLIST=20)
│ ├─ game.ts # startGameService, nextSongService (+ auto-credit theme on Next)
│ ├─ guess.ts # upsertGuessService, lockGuessService
│ ├─ theme.ts # upsertThemeAttemptService, lockThemeAttemptService (score)
│ ├─ reveal.ts # revealSongService (mark correctness + score)
│ ├─ scores.ts # getScoresService (leaderboard)
│ ├─ results.ts # getSongResultsService, getPlayerHitsService
| ├─ recap.ts # recap
│ └─ cleanup.ts # previewExpiredRooms, deleteExpiredRooms
│
├─ middleware/
│ ├─ rateLimit.ts # 5 req / 10s / IP (used on /youtube)
| ├─ errorMiddleware.ts
│
├─ utils/
│ ├─ room.ts # makeRoomCode(len=4), ttl helpers
│ ├─ duration.ts # isoDurationToSeconds(PT#H#M#S)
│ ├─ text.ts # normalize() for theme matching
│ └─ httpError.ts # HttpError, toHttpError, errorMiddleware
