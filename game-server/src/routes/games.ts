import { Router, Request, Response, NextFunction } from "express";
import { v4 as uuidv4 } from "uuid";
import { gameStore } from "../store/gameStore";
import { leaderboardStore } from "../store/leaderboardStore";
import { GameState, GameStatus, JudgeVerdict } from "../types/game";
import { broadcast } from "../ws/wsServer";
import { AppError } from "../middleware/errorHandler";
import { walletRateLimit } from "../middleware/rateLimiter";
import { concurrencyLimit } from "../middleware/concurrencyLimit";
import { readLimiter, writeLimiter, jokeLimiter } from "../middleware/ipRateLimit";
import {
  fetchTheme,
  evaluateJoke,
} from "../services/judgeClient";
import {
  registerGame as registerOnChain,
  settleGame as settleOnChain,
  computeJokeHash,
} from "../services/blockchainClient";
import { config } from "../config";
import { keccak256, toUtf8Bytes } from "ethers";

const router = Router();

function isValidEthAddress(addr: string): boolean {
  return /^0x[0-9a-fA-F]{40}$/.test(addr);
}

function serializeGame(game: GameState) {
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

/**
 * Fallback settlement: used only when the judge agent fails to call settle-game.
 */
function settleGameFallback(game: GameState, verdict: JudgeVerdict): void {
  game.verdict = verdict;
  game.won = verdict.won ?? verdict.score >= 8;
  game.status = GameStatus.Settled;
  game.settledAt = Date.now();
  gameStore.set(game);

  leaderboardStore.recordGame(game.walletAddress, verdict.score, game.won, game.agentName);

  broadcast({
    type: "judge_verdict",
    gameId: game.id,
    data: {
      score: verdict.score,
      reaction: verdict.reaction,
      reasoning: verdict.reasoning,
      won: game.won,
    },
    timestamp: Date.now(),
  });

  broadcast({
    type: "game_settled",
    gameId: game.id,
    data: serializeGame(game),
    timestamp: Date.now(),
  });
}

// POST /api/games — Create a new game
router.post(
  "/api/games",
  writeLimiter,
  walletRateLimit,
  concurrencyLimit,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { walletAddress, agentName: rawAgentName } = req.body;

      if (!walletAddress || typeof walletAddress !== "string") {
        throw new AppError(400, "walletAddress is required");
      }
      if (!isValidEthAddress(walletAddress)) {
        throw new AppError(400, "Invalid wallet address format");
      }

      // Validate optional agentName
      let agentName: string | null = null;
      if (rawAgentName != null) {
        if (typeof rawAgentName !== "string") {
          throw new AppError(400, "agentName must be a string");
        }
        const trimmed = rawAgentName.trim();
        if (trimmed.length > 0) {
          if (trimmed.length > 32) {
            throw new AppError(400, "agentName must be 32 characters or fewer");
          }
          agentName = trimmed;
        }
      }

      // Get theme from judge (required)
      const theme = await fetchTheme();

      const gameId = uuidv4();
      const now = Date.now();

      // Register game on-chain (non-blocking — game proceeds even if registration fails)
      let onChainGameId: string | null = null;
      try {
        const txHash = await registerOnChain(gameId, walletAddress);
        onChainGameId = keccak256(toUtf8Bytes(gameId));
        console.log(`Game ${gameId} registered on-chain: ${txHash}`);
      } catch (err) {
        console.error(`On-chain registration failed for game ${gameId}:`, (err as Error).message);
      }

      const game: GameState = {
        id: gameId,
        onChainGameId,
        status: GameStatus.AwaitingJoke,
        walletAddress,
        agentName,
        prizeAmount: config.PRIZE_AMOUNT,
        theme,
        joke: null,
        verdict: null,
        won: null,
        settlementTxHash: null,
        createdAt: now,
        settledAt: null,
      };

      gameStore.set(game);

      broadcast({
        type: "game_created",
        gameId,
        data: serializeGame(game),
        timestamp: now,
      });

      res.json({
        gameId,
        theme,
        status: game.status,
        prizeAmount: game.prizeAmount,
      });
    } catch (err) {
      next(err);
    }
  }
);

// POST /api/games/:gameId/joke — Submit a joke
router.post(
  "/api/games/:gameId/joke",
  jokeLimiter,
  async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      const { gameId } = req.params;
      const game = gameStore.get(gameId!);

      if (!game) {
        throw new AppError(404, "Game not found");
      }

      if (game.status !== GameStatus.AwaitingJoke) {
        throw new AppError(
          409,
          game.status === GameStatus.Settled ||
            game.status === GameStatus.Judging
            ? "Joke already submitted for this game"
            : `Cannot submit joke in current state: ${game.status}`
        );
      }

      const { joke } = req.body;

      if (!joke || typeof joke !== "string") {
        throw new AppError(400, "joke is required");
      }

      const trimmedJoke = joke.trim();

      if (trimmedJoke.length === 0) {
        throw new AppError(400, "joke cannot be empty");
      }
      if (trimmedJoke.length > 500) {
        throw new AppError(400, "joke must be 500 characters or fewer");
      }

      // Store the joke and transition to judging
      game.joke = trimmedJoke;
      game.status = GameStatus.Judging;
      gameStore.set(game);

      broadcast({
        type: "joke_submitted",
        gameId: game.id,
        data: { joke: trimmedJoke },
        timestamp: Date.now(),
      });

      const jokeHash = computeJokeHash(trimmedJoke);

      // Call the judge agent with rich context
      const verdict = await evaluateJoke(
        {
          gameId: game.id,
          onChainGameId: game.onChainGameId || "",
          wallet: game.walletAddress,
          agentName: game.agentName,
          prizeAmount: game.prizeAmount,
          theme: game.theme,
          joke: trimmedJoke,
          jokeHash,
        },
        (text: string) => {
          broadcast({
            type: "judge_streaming",
            gameId: game.id,
            data: { text },
            timestamp: Date.now(),
          });
        }
      );

      // Re-fetch game state — the judge may have already settled via /internal/settle
      const updatedGame = gameStore.get(gameId!);
      const alreadySettled = updatedGame?.status === GameStatus.Settled;

      if (!alreadySettled) {
        // Fallback: judge didn't call settle-game, so we settle locally
        console.log(`Game ${game.id}: judge did not settle — using fallback settlement`);
        settleGameFallback(game, verdict);

        // Also attempt on-chain settlement as fallback
        let onChainSettled = false;
        let settlementTxHash: string | null = null;
        if (game.onChainGameId) {
          try {
            settlementTxHash = await settleOnChain(
              game.onChainGameId,
              verdict.score,
              game.won!,
              jokeHash
            );
            onChainSettled = true;
            game.settlementTxHash = settlementTxHash;
            gameStore.set(game);
            console.log(`Game ${game.id} settled on-chain (fallback): ${settlementTxHash}`);
          } catch (err) {
            console.error(`On-chain settlement (fallback) failed for game ${game.id}:`, (err as Error).message);
          }
        }

        res.json({
          gameId: game.id,
          score: verdict.score,
          reaction: verdict.reaction,
          reasoning: verdict.reasoning,
          won: game.won,
          status: game.status,
          onChainSettled,
          settlementTxHash,
        });
      } else {
        // Judge already settled — backfill reaction/reasoning from parsed verdict
        console.log(`Game ${game.id}: judge settled autonomously`);
        const settled = updatedGame!;
        if (settled.verdict && (!settled.verdict.reaction || !settled.verdict.reasoning)) {
          settled.verdict.reaction = verdict.reaction || settled.verdict.reaction;
          settled.verdict.reasoning = verdict.reasoning || settled.verdict.reasoning;
          gameStore.set(settled);

          broadcast({
            type: "judge_verdict",
            gameId: settled.id,
            data: {
              score: settled.verdict.score,
              reaction: settled.verdict.reaction,
              reasoning: settled.verdict.reasoning,
              won: settled.won,
            },
            timestamp: Date.now(),
          });
        }
        res.json({
          gameId: settled.id,
          score: verdict.score,
          reaction: verdict.reaction,
          reasoning: verdict.reasoning,
          won: settled.won,
          status: settled.status,
          onChainSettled: true,
          settlementTxHash: null,
        });
      }
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/games/:gameId — Get game state
router.get(
  "/api/games/:gameId",
  readLimiter,
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const { gameId } = req.params;
      const game = gameStore.get(gameId!);

      if (!game) {
        throw new AppError(404, "Game not found");
      }

      res.json(serializeGame(game));
    } catch (err) {
      next(err);
    }
  }
);

// GET /api/games — List games with pagination and filtering
router.get(
  "/api/games",
  readLimiter,
  (req: Request, res: Response, next: NextFunction): void => {
    try {
      const statusFilter = req.query["status"] as string | undefined;
      const limit = Math.min(
        Math.max(
          parseInt((req.query["limit"] as string) || "20", 10) || 20,
          1
        ),
        100
      );
      const offset = Math.max(
        parseInt((req.query["offset"] as string) || "0", 10) || 0,
        0
      );

      let games: GameState[];

      if (
        statusFilter &&
        statusFilter !== "all" &&
        Object.values(GameStatus).includes(statusFilter as GameStatus)
      ) {
        games = gameStore.byStatus(statusFilter);
      } else {
        games = gameStore.all();
      }

      // Sort by createdAt descending (newest first)
      games.sort((a, b) => b.createdAt - a.createdAt);

      const total = games.length;
      const paginated = games.slice(offset, offset + limit);

      res.json({
        games: paginated.map(serializeGame),
        total,
        limit,
        offset,
      });
    } catch (err) {
      next(err);
    }
  }
);

export default router;
