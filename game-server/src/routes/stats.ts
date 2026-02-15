import { Router } from "express";
import { gameStore } from "../store/gameStore";
import { readLimiter } from "../middleware/ipRateLimit";

const router = Router();

router.get("/api/stats", readLimiter, (_req, res) => {
  res.json(gameStore.stats());
});

export default router;
