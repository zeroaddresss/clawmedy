import { Router, Request, Response } from "express";
import { leaderboardStore } from "../store/leaderboardStore";
import { readLimiter } from "../middleware/ipRateLimit";

const router = Router();

router.get("/api/leaderboard", readLimiter, (req: Request, res: Response) => {
  const limit = Math.min(
    Math.max(parseInt((req.query["limit"] as string) || "50", 10) || 50, 1),
    200
  );

  const entries = leaderboardStore.top(limit);

  res.json({ leaderboard: entries });
});

export default router;
