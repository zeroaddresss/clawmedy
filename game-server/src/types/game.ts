export enum GameStatus {
  AwaitingJoke = "awaiting_joke",
  Judging = "judging",
  Settled = "settled",
  Cancelled = "cancelled",
}

export interface JudgeVerdict {
  score: number;
  reaction: string;
  reasoning: string;
  won?: boolean;
}

export interface GameState {
  id: string;
  onChainGameId: string | null;
  status: GameStatus;
  walletAddress: string;
  agentName: string | null;
  prizeAmount: string;
  theme: string;
  joke: string | null;
  verdict: JudgeVerdict | null;
  won: boolean | null;
  settlementTxHash: string | null;
  createdAt: number;
  settledAt: number | null;
}

export interface GameStats {
  totalGames: number;
  activeGames: number;
  totalPrizesAwarded: string;
}
