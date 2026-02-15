import fs from "fs";
import path from "path";
import { GameState, GameStats, GameStatus } from "../types/game";

const DATA_DIR = path.resolve(__dirname, "../../data");
const FILE_PATH = path.join(DATA_DIR, "games.json");

let saveTimer: ReturnType<typeof setTimeout> | null = null;
const DEBOUNCE_MS = 1000;

function load(): Map<string, GameState> {
  try {
    const raw = fs.readFileSync(FILE_PATH, "utf-8");
    const entries: GameState[] = JSON.parse(raw);
    const map = new Map<string, GameState>();
    for (const entry of entries) {
      map.set(entry.id, entry);
    }
    console.log(`Loaded ${map.size} games from disk`);
    return map;
  } catch {
    return new Map();
  }
}

function scheduleSave(): void {
  if (saveTimer) return;
  saveTimer = setTimeout(async () => {
    saveTimer = null;
    try {
      fs.mkdirSync(DATA_DIR, { recursive: true });
      const entries = Array.from(games.values());
      await fs.promises.writeFile(FILE_PATH, JSON.stringify(entries, null, 2));
    } catch (err) {
      console.error("Failed to persist games:", err);
    }
  }, DEBOUNCE_MS);
}

const games = load();

export const gameStore = {
  get(id: string): GameState | undefined {
    return games.get(id);
  },

  set(game: GameState): void {
    games.set(game.id, game);
    scheduleSave();
  },

  delete(id: string): boolean {
    const result = games.delete(id);
    if (result) scheduleSave();
    return result;
  },

  all(): GameState[] {
    return Array.from(games.values());
  },

  active(): GameState[] {
    return this.all().filter(
      (g) =>
        g.status !== GameStatus.Settled && g.status !== GameStatus.Cancelled
    );
  },

  byStatus(status: string): GameState[] {
    return this.all().filter((g) => g.status === status);
  },

  stats(): GameStats {
    const allGames = this.all();
    const activeGames = this.active();
    const totalPrizesAwarded = allGames
      .filter((g) => g.status === GameStatus.Settled && g.won === true)
      .reduce((sum, g) => sum + BigInt(g.prizeAmount), 0n);
    return {
      totalGames: allGames.length,
      activeGames: activeGames.length,
      totalPrizesAwarded: totalPrizesAwarded.toString(),
    };
  },
};
