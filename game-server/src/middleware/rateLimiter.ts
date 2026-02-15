import { Request, Response, NextFunction } from "express";

interface RateLimitConfig {
  windowMs: number;
  maxGames: number;
}

interface RateLimitEntry {
  timestamps: number[];
  bannedUntil?: number;
}

const walletLimits = new Map<string, RateLimitEntry>();

const RATE_LIMIT_WINDOW_MS = parseInt(
  process.env["RATE_LIMIT_WINDOW_MS"] || "300000",
  10
);
const RATE_LIMIT_MAX_GAMES = parseInt(
  process.env["RATE_LIMIT_MAX_GAMES"] || "1",
  10
);
const INJECTION_BAN_DURATION_MS = parseInt(
  process.env["INJECTION_BAN_DURATION_MS"] || "1800000",
  10
);

const injectionCounts = new Map<string, number>();

function getConfig(): RateLimitConfig {
  return {
    windowMs: RATE_LIMIT_WINDOW_MS,
    maxGames: RATE_LIMIT_MAX_GAMES,
  };
}

/**
 * Per-wallet rate limiter for game creation.
 * Max N games per wallet per time window.
 */
export function walletRateLimit(
  req: Request,
  res: Response,
  next: NextFunction
): void {
  const walletAddress = req.body?.walletAddress as string | undefined;
  if (!walletAddress) {
    // Let validation in the route handler deal with missing wallet
    next();
    return;
  }

  const wallet = walletAddress.toLowerCase();
  const now = Date.now();
  const config = getConfig();

  const entry = walletLimits.get(wallet) || { timestamps: [] };

  // Check for temp ban
  if (entry.bannedUntil && now < entry.bannedUntil) {
    const retryAfter = Math.ceil((entry.bannedUntil - now) / 1000);
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({
      error: "Temporarily banned due to repeated abuse",
      retryAfter,
    });
    return;
  }

  // Clear expired ban
  if (entry.bannedUntil && now >= entry.bannedUntil) {
    entry.bannedUntil = undefined;
  }

  // Filter timestamps to current window
  entry.timestamps = entry.timestamps.filter(
    (t) => now - t < config.windowMs
  );

  if (entry.timestamps.length >= config.maxGames) {
    const oldestInWindow = entry.timestamps[0]!;
    const retryAfter = Math.ceil(
      (oldestInWindow + config.windowMs - now) / 1000
    );
    res.setHeader("Retry-After", String(retryAfter));
    res.status(429).json({
      error: "Rate limited",
      retryAfter,
    });
    walletLimits.set(wallet, entry);
    return;
  }

  entry.timestamps.push(now);
  walletLimits.set(wallet, entry);
  next();
}

/**
 * Record a suspected prompt injection attempt for a wallet.
 * Returns true if the wallet should be banned.
 */
export function recordInjectionAttempt(walletAddress: string): boolean {
  const wallet = walletAddress.toLowerCase();
  const count = (injectionCounts.get(wallet) || 0) + 1;
  injectionCounts.set(wallet, count);

  if (count >= 3) {
    const entry = walletLimits.get(wallet) || { timestamps: [] };
    entry.bannedUntil = Date.now() + INJECTION_BAN_DURATION_MS;
    walletLimits.set(wallet, entry);
    console.warn(
      `Wallet ${walletAddress} temp-banned for ${INJECTION_BAN_DURATION_MS}ms after ${count} injection attempts`
    );
    return true;
  }

  console.warn(
    `Suspected prompt injection from ${walletAddress} (attempt ${count}/3)`
  );
  return false;
}
