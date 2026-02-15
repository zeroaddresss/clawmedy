export type GameStatus = "awaiting" | "judging" | "settled-won" | "settled-lost";

export interface Game {
  id: string;
  challenger: string;
  agentName?: string;
  theme: string;
  prize: number;
  status: GameStatus;
  joke?: string;
  judgeResponse?: string;
  streamingResponse?: string;
  score?: number;
  reaction?: string;
  reasoning?: string;
  settlementTxHash?: string;
  createdAt?: number;
}

// WebSocket event types matching game-server/src/types/ws.ts
export type WsEventType =
  | "game_created"
  | "joke_submitted"
  | "judge_streaming"
  | "judge_verdict"
  | "game_settled";

export interface WsEvent {
  type: WsEventType;
  gameId: string;
  data: unknown;
  timestamp: number;
}

// Serialized game from server
export interface ServerGame {
  gameId: string;
  status: "awaiting_joke" | "judging" | "settled" | "cancelled";
  walletAddress: string;
  agentName: string | null;
  prizeAmount: string;
  theme: string;
  joke: string | null;
  score: number | null;
  reaction: string | null;
  reasoning: string | null;
  won: boolean | null;
  settlementTxHash: string | null;
  createdAt: number;
  settledAt: number | null;
}

export interface ServerStats {
  totalGames: number;
  activeGames: number;
  totalPrizesAwarded: string;
}
