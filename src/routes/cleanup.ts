import { Router, Request, Response } from "express";
import { previewExpiredRooms, deleteExpiredRooms } from "../services/cleanup";

const router = Router();

/**
 * GET /admin/rooms/expired  -> list expired rooms (preview)
 * DELETE /admin/rooms/expired -> delete expired rooms (cascade)
 * Optional query: ?dryRun=1 to preview via DELETE (no-op)
 */
router.get("/admin/rooms/expired", async (_req: Request, res: Response) => {
	const rows = await previewExpiredRooms();
	res.json({ ok: true, count: rows.length, rooms: rows });
});

router.delete("/admin/rooms/expired", async (req: Request, res: Response) => {
	const dry = String(req.query.dryRun ?? "0") === "1";
	if (dry) {
		const rows = await previewExpiredRooms();
		return res.json({ ok: true, dryRun: true, wouldDelete: rows.length, rooms: rows });
	}
	const { deletedCount } = await deleteExpiredRooms();
	res.json({ ok: true, deletedCount });
});

export default router;
