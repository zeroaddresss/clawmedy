"use client";

import { useEffect, useRef, useCallback, useState } from "react";
import { Game, GameStatus, ServerGame, WsEvent } from "./types";

const GAME_SERVER_WS =
  process.env.NEXT_PUBLIC_GAME_SERVER_WS || "ws://localhost:3001/ws";
const API_BASE =
  process.env.NEXT_PUBLIC_GAME_SERVER_URL || "http://localhost:3001";

const RECONNECT_BASE_MS = 1000;
const RECONNECT_MAX_MS = 30000;

/** Map game-server status strings to frontend GameStatus */
function mapStatus(
  serverStatus: string,
  won: boolean | null
): GameStatus {
  switch (serverStatus) {
    case "awaiting_joke":
      return "awaiting";
    case "judging":
      return "judging";
    case "settled":
      return won ? "settled-won" : "settled-lost";
    default:
      return "awaiting";
  }
}

/** Parse a prize amount (wei string or number) into a display number */
function parsePrize(raw: string | number | undefined | null): number {
  if (!raw) return 0;
  const s = String(raw);
  // If it looks like a wei value (>12 digits), convert to tokens
  if (s.length > 12) {
    try {
      return Math.round(Number(BigInt(s) / BigInt(10 ** 18)));
    } catch {
      return 0;
    }
  }
  return Number(s) || 0;
}

/** Convert a ServerGame to a frontend Game */
function serverToGame(data: ServerGame): Game {
  return {
    id: data.gameId,
    challenger: data.walletAddress || "0x0",
    agentName: data.agentName || undefined,
    theme: data.theme || "",
    prize: parsePrize(data.prizeAmount),
    status: mapStatus(data.status, data.won),
    joke: data.joke || undefined,
    judgeResponse: data.reaction || undefined,
    score: data.score ?? undefined,
    reaction: data.reaction || undefined,
    reasoning: data.reasoning || undefined,
    settlementTxHash: data.settlementTxHash || undefined,
    createdAt: data.createdAt,
  };
}

export interface UseGameSocketReturn {
  games: Game[];
  connected: boolean;
}

export function useGameSocket(): UseGameSocketReturn {
  const [games, setGames] = useState<Game[]>([]);
  const [connected, setConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const retriesRef = useRef(0);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const mountedRef = useRef(true);

  // Fetch initial game list via REST
  const fetchInitialGames = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/api/games?limit=50`);
      if (!res.ok) return;
      const body = await res.json();
      const fetched: Game[] = (body.games || []).map(
        (g: ServerGame) => serverToGame(g)
      );
      if (mountedRef.current) {
        setGames(fetched);
      }
    } catch {
      // Silently ignore -- WS events will populate
    }
  }, []);

  const handleWsEvent = useCallback(
    (msg: WsEvent) => {
      const { type, gameId } = msg;
      // data shape varies per event type
      const data = msg.data as Record<string, unknown>;

      setGames((prev) => {
        switch (type) {
          case "game_created": {
            if (prev.some((g) => g.id === gameId)) return prev;
            const newGame = serverToGame(data as unknown as ServerGame);
            if (!newGame.id) newGame.id = gameId;
            return [newGame, ...prev];
          }

          case "joke_submitted": {
            return prev.map((g) =>
              g.id === gameId
                ? {
                    ...g,
                    joke: data.joke as string,
                    status: "judging" as GameStatus,
                    streamingResponse: "",
                  }
                : g
            );
          }

          case "judge_streaming": {
            const chunk = ((data.text || data.chunk || "") as string);
            return prev.map((g) =>
              g.id === gameId
                ? {
                    ...g,
                    streamingResponse: (g.streamingResponse || "") + chunk,
                  }
                : g
            );
          }

          case "judge_verdict": {
            return prev.map((g) =>
              g.id === gameId
                ? {
                    ...g,
                    score: Number(data.score),
                    reaction: data.reaction as string,
                    reasoning: data.reasoning as string,
                    judgeResponse: data.reaction as string,
                    streamingResponse: undefined,
                  }
                : g
            );
          }

          case "game_settled": {
            const settled = serverToGame(data as unknown as ServerGame);
            if (!settled.id) settled.id = gameId;
            return prev.map((g) => (g.id === gameId ? settled : g));
          }

          default:
            return prev;
        }
      });
    },
    []
  );

  const connect = useCallback(() => {
    if (wsRef.current?.readyState === WebSocket.OPEN) return;

    const ws = new WebSocket(GAME_SERVER_WS);
    wsRef.current = ws;

    ws.onopen = () => {
      if (!mountedRef.current) return;
      setConnected(true);
      retriesRef.current = 0;
      fetchInitialGames();
    };

    ws.onclose = () => {
      if (!mountedRef.current) return;
      setConnected(false);
      wsRef.current = null;

      // Exponential backoff reconnect
      const delay = Math.min(
        RECONNECT_BASE_MS * 2 ** retriesRef.current,
        RECONNECT_MAX_MS
      );
      retriesRef.current++;
      reconnectTimerRef.current = setTimeout(() => {
        if (mountedRef.current) connect();
      }, delay);
    };

    ws.onerror = () => {
      // onclose will fire after onerror, triggering reconnect
    };

    ws.onmessage = (evt) => {
      if (!mountedRef.current) return;
      try {
        const msg: WsEvent = JSON.parse(evt.data);
        handleWsEvent(msg);
      } catch {
        // Ignore malformed messages
      }
    };
  }, [fetchInitialGames, handleWsEvent]);

  useEffect(() => {
    mountedRef.current = true;
    connect();
    return () => {
      mountedRef.current = false;
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current);
      if (wsRef.current) {
        wsRef.current.onclose = null; // prevent reconnect on cleanup
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { games, connected };
}
