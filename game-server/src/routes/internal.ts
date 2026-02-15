import { Router, Request, Response, NextFunction } from "express";
import { gameStore } from "../store/gameStore";
import { leaderboardStore } from "../store/leaderboardStore";
import { GameStatus } from "../types/game";
import { broadcast } from "../ws/wsServer";
import { AppError } from "../middleware/errorHandler";
import {
  settleGame as settleOnChain,
  computeJokeHash,
} from "../services/blockchainClient";

const router = Router();

// Middleware: restrict to localhost only
function localhostOnly(req: Request, _res: Response, next: NextFunction): void {
  const ip = req.ip || req.socket.remoteAddress || "";
  const allowed = ["127.0.0.1", "::1", "::ffff:127.0.0.1"];
  if (!allowed.includes(ip)) {
    next(new AppError(403, "Internal API: localhost access only"));
    return;
  }
  next();
}

router.use("/internal", localhostOnly);

// GET /internal/player-history?wallet=0x...&limit=10
router.get(
  "/internal/player-history",
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const wallet = req.query["wallet"] as string;
      const limit = Math.min(parseInt(req.query["limit"] as string || "10", 10) || 10, 100);

      if (!wallet) {
        throw new AppError(400, "wallet query parameter is required");
      }

      const games = gameStore
        .all()
        .filter(
          (g) =>
            g.walletAddress.toLowerCase() === wallet.toLowerCase() &&
            g.status === GameStatus.Settled
        )
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit)
        .map((g) => ({
          gameId: g.id,
          theme: g.theme,
          joke: g.joke,
          score: g.verdict?.score ?? null,
          won: g.won,
          createdAt: g.createdAt,
        }));

      res.json(games);
    } catch (err) {
      next(err);
    }
  }
);

// GET /internal/leaderboard?limit=20
router.get(
  "/internal/leaderboard",
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const limit = Math.min(parseInt(req.query["limit"] as string || "20", 10) || 20, 100);
      const entries = leaderboardStore.top(limit);
      res.json(entries);
    } catch (err) {
      next(err);
    }
  }
);

// GET /internal/recent-themes?limit=20
router.get(
  "/internal/recent-themes",
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const limit = Math.min(parseInt(req.query["limit"] as string || "20", 10) || 20, 100);

      const themes = gameStore
        .all()
        .filter((g) => g.theme)
        .sort((a, b) => b.createdAt - a.createdAt)
        .slice(0, limit)
        .map((g) => ({
          theme: g.theme,
          gameId: g.id,
          createdAt: g.createdAt,
        }));

      res.json(themes);
    } catch (err) {
      next(err);
    }
  }
);

function serializeGame(game: import("../types/game").GameState) {
  return {
    gameId: game.id,
    status: game.status,
    walletAddress: game.walletAddress,
    agentName: game.agentName,
    prizeAmount: game.prizeAmount,
    theme: game.theme,
    joke: game.joke,
    score: game.verdict?.score ?? null,
    reaction: game.verdict?.reaction ?? null,
    reasoning: game.verdict?.reasoning ?? null,
    won: game.won,
    settlementTxHash: game.settlementTxHash,
    createdAt: game.createdAt,
    settledAt: game.settledAt,
  };
}

// POST /internal/settle
router.post(
  "/internal/settle",
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gameId, score, won, jokeHash, reaction, reasoning } = req.body;

      if (!gameId || typeof score !== "number" || typeof won !== "boolean") {
        throw new AppError(400, "gameId, score (number), and won (boolean) are required");
      }

      // Find the game by onChainGameId
      const allGames = gameStore.all();
      const game = allGames.find((g) => g.onChainGameId === gameId);

      if (!game) {
        throw new AppError(404, `Game not found for onChainGameId: ${gameId}`);
      }

      if (game.status === GameStatus.Settled) {
        throw new AppError(409, "Game already settled");
      }

      // 1. Update game store — preserve reaction/reasoning from judge if provided
      game.verdict = {
        score,
        reaction: reaction || game.verdict?.reaction || "",
        reasoning: reasoning || game.verdict?.reasoning || "",
        won,
      };
      game.won = won;
      game.status = GameStatus.Settled;
      game.settledAt = Date.now();
      gameStore.set(game);

      // 2. Update leaderboard
      leaderboardStore.recordGame(game.walletAddress, score, won, game.agentName);

      // 3. Broadcast WebSocket events
      broadcast({
        type: "judge_verdict",
        gameId: game.id,
        data: {
          score,
          reaction: game.verdict.reaction,
          reasoning: game.verdict.reasoning,
          won,
        },
        timestamp: Date.now(),
      });

      broadcast({
        type: "game_settled",
        gameId: game.id,
        data: serializeGame(game),
        timestamp: Date.now(),
      });

      // 4. Settle on-chain
      let onChainSettled = false;
      let txHash: string | null = null;
      try {
        const hash = jokeHash || computeJokeHash(game.joke || "");
        txHash = await settleOnChain(gameId, score, won, hash);
        onChainSettled = true;
        game.settlementTxHash = txHash;
        gameStore.set(game);
        console.log(`Game ${game.id} settled on-chain via judge agent: ${txHash}`);
      } catch (err) {
        console.error(`On-chain settlement failed for game ${game.id}:`, (err as Error).message);
      }

      res.json({ success: true, txHash, onChainSettled });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
