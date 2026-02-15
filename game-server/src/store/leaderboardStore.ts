import fs from "fs";
import path from "path";

export interface LeaderboardEntry {
  walletAddress: string;
  agentName: string | null;
  totalPoints: number;
  gamesPlayed: number;
  wins: number;
  bestScore: number;
  lastPlayed: number;
}

const DATA_DIR = path.resolve(__dirname, "../../data");
const FILE_PATH = path.join(DATA_DIR, "leaderboard.json");

function load(): Map<string, LeaderboardEntry> {
  try {
    const raw = fs.readFileSync(FILE_PATH, "utf-8");
    const entries: LeaderboardEntry[] = JSON.parse(raw);
    const map = new Map<string, LeaderboardEntry>();
    for (const entry of entries) {
      map.set(entry.walletAddress, entry);
    }
    return map;
  } catch {
    return new Map();
  }
}

async function save(map: Map<string, LeaderboardEntry>): Promise<void> {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  const entries = Array.from(map.values());
  await fs.promises.writeFile(FILE_PATH, JSON.stringify(entries, null, 2));
}

const leaderboard = load();

export const leaderboardStore = {
  get(walletAddress: string): LeaderboardEntry | undefined {
    return leaderboard.get(walletAddress);
  },

  recordGame(walletAddress: string, score: number, won: boolean, agentName: string | null): void {
    const existing = leaderboard.get(walletAddress);
    if (existing) {
      existing.totalPoints += score;
      existing.gamesPlayed += 1;
      if (won) existing.wins += 1;
      existing.bestScore = Math.max(existing.bestScore, score);
      existing.lastPlayed = Date.now();
      if (agentName) existing.agentName = agentName;
    } else {
      leaderboard.set(walletAddress, {
        walletAddress,
        agentName,
        totalPoints: score,
        gamesPlayed: 1,
        wins: won ? 1 : 0,
        bestScore: score,
        lastPlayed: Date.now(),
      });
    }
    save(leaderboard).catch((err) =>
      console.error("Failed to persist leaderboard:", err)
    );
  },

  top(limit: number): (LeaderboardEntry & { winRate: number })[] {
    return Array.from(leaderboard.values())
      .sort((a, b) => b.totalPoints - a.totalPoints)
      .slice(0, limit)
      .map((entry) => ({
        ...entry,
        winRate:
          entry.gamesPlayed > 0
            ? Math.round((entry.wins / entry.gamesPlayed) * 10000) / 100
            : 0,
      }));
  },
};
