import OpenAI from "openai";
import { config } from "../config";
import { JudgeVerdict } from "../types/game";

const JUDGE_TIMEOUT_MS = 60_000;
const JUDGE_MODEL = "openclaw:judge";

const openai = new OpenAI({
  baseURL: config.OPENCLAW_URL,
  apiKey: config.OPENCLAW_KEY,
});

/**
 * Check judge health by sending a simple request to the OpenClaw gateway.
 */
export async function checkJudgeHealth(): Promise<void> {
  try {
    const response = await openai.chat.completions.create({
      model: JUDGE_MODEL,
      messages: [{ role: "user", content: "Say OK" }],
      max_tokens: 10,
    });
    if (!response.choices[0]?.message?.content) {
      throw new Error("Empty response from judge");
    }
    console.log("Judge health check passed via OpenClaw gateway");
  } catch (err) {
    throw new Error(
      `Judge health check failed (${config.OPENCLAW_URL}): ${err instanceof Error ? err.message : err}`
    );
  }
}

/**
 * Fetch a comedy theme from the judge agent via OpenClaw.
 * The judge is instructed to use get-recent-themes to avoid repetition.
 */
export async function fetchTheme(): Promise<string> {
  const prompt = `Generate a comedy theme for the Clawmedy Arena.
Themes MUST be about crypto, web3, DeFi, blockchain, NFTs, DAOs, trading, tokenomics, VC culture, CT (crypto twitter), startup life, or tech/crypto culture in general.
Call get-recent-themes first to avoid repeating recent themes.
Respond with ONLY the theme text, nothing else.`;

  const response = await openai.chat.completions.create({
    model: JUDGE_MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 100,
  });

  const theme = response.choices[0]?.message?.content?.trim();
  if (!theme) {
    throw new Error("Judge returned empty theme");
  }
  return theme;
}

interface EvaluateJokeContext {
  gameId: string;
  onChainGameId: string;
  wallet: string;
  agentName: string | null;
  prizeAmount: string;
  theme: string;
  joke: string;
  jokeHash: string;
}

/**
 * Send a joke to the judge for evaluation via streaming.
 * Provides rich context so the judge agent can use tools for history lookup,
 * on-chain settlement, and memory logging.
 * Calls `onChunk` with each streamed text fragment (for WS broadcasting).
 */
export async function evaluateJoke(
  ctx: EvaluateJokeContext,
  onChunk: (text: string) => void
): Promise<JudgeVerdict> {
  const prompt = `## Game Context
- Game ID: ${ctx.gameId}
- On-chain Game ID: ${ctx.onChainGameId}
- Player: ${ctx.wallet}
- Agent: ${ctx.agentName || "Anonymous"}
- Prize: 1000 $CMDY (awarded if score >= 8)
- Theme: ${ctx.theme}
- Joke Hash: ${ctx.jokeHash}

## Joke
${ctx.joke}

## Instructions
1. Call get-player-history for this wallet to check their past performance and if they've used similar jokes
2. Consult your MEMORY.md for notes on this player or similar joke patterns
3. Judge the joke strictly on comedic merit per your SOUL.md scoring rules
4. Decide the score (1-10) and whether the challenger wins (score >= 8)
5. Call settle-game to execute the on-chain settlement: settle-game.sh ${ctx.onChainGameId} <score> <true|false> ${ctx.jokeHash}
6. Call remember-joke to log this evaluation
7. Return your verdict as JSON: {"score": N, "reaction": "...", "reasoning": "...", "won": bool}`;

  const stream = await openai.chat.completions.create({
    model: JUDGE_MODEL,
    messages: [{ role: "user", content: prompt }],
    max_tokens: 512,
    stream: true,
  });

  let fullText = "";

  for await (const chunk of stream) {
    const delta = chunk.choices[0]?.delta?.content;
    if (delta) {
      onChunk(delta);
      fullText += delta;
    }
  }

  // Parse the accumulated JSON verdict
  const trimmed = fullText.trim();
  let verdict: JudgeVerdict;
  try {
    verdict = JSON.parse(trimmed) as JudgeVerdict;
  } catch {
    // Try to extract JSON from the response if there's extra text
    const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error(`Judge returned invalid JSON: ${trimmed.slice(0, 200)}`);
    }
    verdict = JSON.parse(jsonMatch[0]) as JudgeVerdict;
  }

  if (typeof verdict.score !== "number" || !verdict.reaction || !verdict.reasoning) {
    throw new Error(`Judge verdict missing required fields: ${JSON.stringify(verdict)}`);
  }

  return verdict;
}
