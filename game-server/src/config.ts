import dotenv from "dotenv";

dotenv.config();

interface EnvConfig {
  PORT: number;
  OPENCLAW_URL: string;
  OPENCLAW_KEY: string;
  RPC_URL: string;
  PRIVATE_KEY: string;
  FRONTEND_URL: string;
  TRUST_PROXY: string;
  PRIZE_AMOUNT: string;
}

function requiredEnv(key: string): string {
  const value = process.env[key];
  if (!value) {
    console.error(`FATAL: Required environment variable ${key} is not set.`);
    process.exit(1);
  }
  return value;
}

function loadConfig(): EnvConfig {
  return {
    PORT: parseInt(process.env["PORT"] || "3001", 10),
    OPENCLAW_URL: requiredEnv("OPENCLAW_URL"),
    OPENCLAW_KEY: requiredEnv("OPENCLAW_KEY"),
    RPC_URL: requiredEnv("RPC_URL"),
    PRIVATE_KEY: requiredEnv("PRIVATE_KEY"),
    FRONTEND_URL: process.env["FRONTEND_URL"] || "https://clawmedy.fun",
    TRUST_PROXY: process.env["TRUST_PROXY"] || "false",
    PRIZE_AMOUNT: process.env["PRIZE_AMOUNT"] || "1000000000000000000000",
  };
}

export const config = loadConfig();
