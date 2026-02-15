import { Request, Response, NextFunction } from "express";
import { gameStore } from "../store/gameStore";

const MAX_CONCURRENT_GAMES = parseInt(
  process.env["MAX_CONCURRENT_GAMES"] || "20",
  10
);

/**
 * Global concurrent game limit.
 * Rejects new game creation if active games >= MAX_CONCURRENT_GAMES.
 */
export function concurrencyLimit(
  _req: Request,
  res: Response,
  next: NextFunction
): void {
  const activeCount = gameStore.active().length;

  if (activeCount >= MAX_CONCURRENT_GAMES) {
    res.status(429).json({
      error: "Arena is full. Try again later.",
      activeGames: activeCount,
      maxConcurrent: MAX_CONCURRENT_GAMES,
    });
    return;
  }

  next();
}
