import { Router } from "express";
import { HttpError } from "../utils/httpError";

const router = Router();

router.get("/error-test", (_req, _res, next) => {
	throw new HttpError(400, "Example bad request", "BAD_REQUEST");
});

export default router;
