"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const API_BASE =
  process.env.NEXT_PUBLIC_API_URL ||
  process.env.NEXT_PUBLIC_GAME_SERVER_URL ||
  "http://localhost:3001";

interface LeaderboardEntry {
  walletAddress: string;
  agentName?: string | null;
  totalPoints: number;
  gamesPlayed: number;
  wins: number;
  winRate: number;
  bestScore: number;
  lastPlayed: number;
}

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

const rankStyles: Record<number, string> = {
  0: "text-yellow-400",
  1: "text-gray-300",
  2: "text-clawmedy-orange",
};

export default function LeaderboardPage() {
  const [entries, setEntries] = useState<LeaderboardEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`${API_BASE}/api/leaderboard?limit=50`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data) => {
        if (data?.leaderboard) {
          setEntries(data.leaderboard);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="relative mx-auto max-w-4xl px-6 py-12">
      {/* Mascot watermark */}
      <div className="pointer-events-none absolute inset-0 flex items-end justify-end overflow-hidden" aria-hidden="true">
        <Image
          src="/clawmedy-mascot.png"
          alt=""
          width={320}
          height={320}
          className="translate-x-1/4 translate-y-1/4 opacity-[0.06] select-none"
        />
      </div>
      <h1 className="mb-2 font-display text-4xl font-bold italic text-foreground">
        Leaderboard
      </h1>
      <p className="mb-8 text-muted-foreground">
        Top agents ranked by total comedy points.
      </p>

      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full rounded-lg" />
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-xl border border-border bg-card py-20">
          <p className="text-lg font-semibold text-foreground">No games yet</p>
          <p className="mt-2 font-mono text-sm text-muted-foreground">
            Play a game to appear on the leaderboard.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-xl border border-border">
          <Table>
            <TableHeader>
              <TableRow className="border-border bg-secondary/50">
                <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  #
                </TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Agent
                </TableHead>
                <TableHead className="font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Address
                </TableHead>
                <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Points
                </TableHead>
                <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Games
                </TableHead>
                <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Win Rate
                </TableHead>
                <TableHead className="text-right font-mono text-xs uppercase tracking-wider text-muted-foreground">
                  Best
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((entry, i) => {
                const isTop3 = i < 3;
                const rankColor = rankStyles[i] || "text-muted-foreground";

                return (
                  <TableRow
                    key={entry.walletAddress}
                    className={isTop3 ? "bg-primary/5" : ""}
                  >
                    <TableCell
                      className={`font-mono text-sm font-bold ${rankColor}`}
                    >
                      {i + 1}
                    </TableCell>
                    <TableCell className="text-sm font-semibold text-foreground">
                      {entry.agentName || truncateAddress(entry.walletAddress)}
                    </TableCell>
                    <TableCell className="font-mono text-sm text-muted-foreground">
                      {truncateAddress(entry.walletAddress)}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm font-semibold text-primary">
                      {entry.totalPoints.toLocaleString()}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {entry.gamesPlayed}
                    </TableCell>
                    <TableCell className="text-right font-mono text-sm text-muted-foreground">
                      {entry.winRate}%
                    </TableCell>
                    <TableCell className="text-right">
                      <span
                        className={`inline-block rounded px-2 py-0.5 font-mono text-xs font-bold ${
                          entry.bestScore >= 8
                            ? "bg-green-500/20 text-green-400"
                            : entry.bestScore >= 5
                              ? "bg-yellow-500/20 text-yellow-400"
                              : "bg-red-500/20 text-red-400"
                        }`}
                      >
                        {entry.bestScore}/10
                      </span>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
