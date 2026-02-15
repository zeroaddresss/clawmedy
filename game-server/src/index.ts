import { createServer } from "http";
import express from "express";
import cors from "cors";
import helmet from "helmet";
import { config } from "./config";
import { errorHandler } from "./middleware/errorHandler";
import { globalIpLimiter } from "./middleware/ipRateLimit";
import healthRouter from "./routes/health";
import statsRouter from "./routes/stats";
import gamesRouter from "./routes/games";
import leaderboardRouter from "./routes/leaderboard";
import internalRouter from "./routes/internal";
import { initWebSocketServer } from "./ws/wsServer";
import { initBlockchain } from "./services/blockchainClient";
import { checkJudgeHealth } from "./services/judgeClient";

const app = express();

// Trust proxy configuration
if (config.TRUST_PROXY !== "false") {
  const parsed = parseInt(config.TRUST_PROXY, 10);
  app.set("trust proxy", config.TRUST_PROXY === "true" ? 1 : isNaN(parsed) ? config.TRUST_PROXY : parsed);
}

// Middleware (order matters)
app.use(helmet());
app.use(express.json({ limit: "16kb" }));
app.use(
  cors({
    origin: [
      config.FRONTEND_URL,
      "https://clawmedy.fun",
      "https://www.clawmedy.fun",
    ],
    credentials: true,
  })
);
app.use(globalIpLimiter);

// Routes
app.use(healthRouter);
app.use(statsRouter);
app.use(gamesRouter);
app.use(leaderboardRouter);
app.use(internalRouter);

// Error handler (must be last)
app.use(errorHandler);

// Create HTTP server and attach WebSocket
const server = createServer(app);
initWebSocketServer(server);

async function start(): Promise<void> {
  try {
    await initBlockchain();
  } catch (err) {
    console.error("Blockchain initialization failed:", (err as Error).message);
    process.exit(1);
  }

  try {
    await checkJudgeHealth();
  } catch (err) {
    console.error("Judge health check failed:", (err as Error).message);
    process.exit(1);
  }

  server.listen(config.PORT, () => {
    console.log(`Game server listening on port ${config.PORT}`);
    console.log(`Health check: http://localhost:${config.PORT}/health`);
    console.log(`WebSocket:    ws://localhost:${config.PORT}/ws`);
  });
}

start();

export { app, server };
