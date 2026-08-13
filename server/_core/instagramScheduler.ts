import { timingSafeEqual } from "node:crypto";
import type { Express, Request, Response } from "express";
import { refreshExpiringInstagramTokens } from "../instagramService";

function isAuthorized(request: Request) {
  const expected = process.env.INSTAGRAM_SCHEDULER_SECRET;
  const provided = request.header("x-instagram-scheduler-secret");
  if (!expected || !provided) return false;
  const expectedBuffer = Buffer.from(expected);
  const providedBuffer = Buffer.from(provided);
  return expectedBuffer.length === providedBuffer.length && timingSafeEqual(expectedBuffer, providedBuffer);
}

/**
 * This route is intended for a once-daily server scheduler. It deliberately
 * exposes only aggregate counts and does not expose token or account details.
 */
export function registerInstagramSchedulerRoutes(app: Express) {
  app.post("/api/scheduled/instagram-token-refresh", async (req: Request, res: Response) => {
    if (!isAuthorized(req)) {
      res.status(401).json({ ok: false });
      return;
    }

    try {
      const results = await refreshExpiringInstagramTokens();
      res.json({ ok: true, ...results });
    } catch {
      console.error("[Instagram Scheduler] Refresh job failed.");
      res.status(500).json({ ok: false });
    }
  });
}
