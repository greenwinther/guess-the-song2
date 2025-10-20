import router from "../routes/testError";
import { HttpError } from "../utils/httpError";

// good patterns
router.get("/error-test", (_req, _res) => {
	throw new HttpError(400, "Example bad request", "BAD_REQUEST");
});

// for async:
router.get("/error-test-async", async (_req, _res, next) => {
	try {
		// ...await stuff
		throw new HttpError(400, "Bad async", "BAD_REQUEST");
	} catch (e) {
		next(e);
	}
});
