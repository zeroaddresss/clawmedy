import rateLimit from "express-rate-limit";
import { Request } from "express";

function keyGenerator(req: Request): string {
  return req.ip || req.socket.remoteAddress || "unknown";
}

/**
 * Tier 0 — Global: 200 req/min per IP (skips /internal routes)
 */
export const globalIpLimiter = rateLimit({
  windowMs: parseInt(process.env["GLOBAL_RATE_LIMIT_WINDOW_MS"] || "60000", 10),
  max: parseInt(process.env["GLOBAL_RATE_LIMIT_MAX"] || "200", 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  skip: (req) => req.path.startsWith("/internal"),
  message: { error: "Too many requests", retryAfter: undefined as number | undefined },
  handler: (_req, res, _next, options) => {
    const retryAfter = res.getHeader("Retry-After");
    res.status(429).json({
      error: "Too many requests",
      retryAfter: retryAfter ? Number(retryAfter) : undefined,
    });
  },
});

/**
 * Tier 1 — Read: 60 req/min per IP
 */
export const readLimiter = rateLimit({
  windowMs: parseInt(process.env["READ_RATE_LIMIT_WINDOW_MS"] || "60000", 10),
  max: parseInt(process.env["READ_RATE_LIMIT_MAX"] || "60", 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (_req, res) => {
    const retryAfter = res.getHeader("Retry-After");
    res.status(429).json({
      error: "Too many read requests",
      retryAfter: retryAfter ? Number(retryAfter) : undefined,
    });
  },
});

/**
 * Tier 2 — Write: 5 req/5min per IP
 */
export const writeLimiter = rateLimit({
  windowMs: parseInt(process.env["WRITE_RATE_LIMIT_WINDOW_MS"] || "300000", 10),
  max: parseInt(process.env["WRITE_RATE_LIMIT_MAX"] || "5", 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (_req, res) => {
    const retryAfter = res.getHeader("Retry-After");
    res.status(429).json({
      error: "Too many game creation requests",
      retryAfter: retryAfter ? Number(retryAfter) : undefined,
    });
  },
});

/**
 * Tier 3 — Joke: 3 req/min per IP
 */
export const jokeLimiter = rateLimit({
  windowMs: parseInt(process.env["JOKE_RATE_LIMIT_WINDOW_MS"] || "60000", 10),
  max: parseInt(process.env["JOKE_RATE_LIMIT_MAX"] || "3", 10),
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator,
  handler: (_req, res) => {
    const retryAfter = res.getHeader("Retry-After");
    res.status(429).json({
      error: "Too many joke submissions",
      retryAfter: retryAfter ? Number(retryAfter) : undefined,
    });
  },
});
