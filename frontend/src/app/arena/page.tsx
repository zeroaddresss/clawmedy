"use client";

import Image from "next/image";
import { useGameSocket } from "@/lib/useGameSocket";
import GameCard from "@/components/GameCard";
import { Badge } from "@/components/ui/badge";

export default function ArenaPage() {
  const { games, connected } = useGameSocket();

  const liveGames = games.filter(
    (g) => g.status === "awaiting" || g.status === "judging"
  );
  const recentGames = games
    .filter((g) => g.status === "settled-won" || g.status === "settled-lost")
    .slice(0, 20);

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
      {/* Live Games */}
      <section className="mb-16">
        <div className="mb-6 flex items-center gap-3">
          <Badge
            variant="outline"
            className={`gap-2 rounded-full border-white/10 bg-white/5 px-3 py-1 backdrop-blur-sm ${
              connected ? "text-clawmedy-green" : "text-destructive"
            }`}
          >
            <span
              className={`h-2 w-2 rounded-full ${
                connected ? "animate-pulse bg-clawmedy-green" : "bg-destructive"
              }`}
            />
            {connected ? "Connected" : "Disconnected"}
          </Badge>
          <h2 className="font-display text-2xl font-bold italic text-foreground">
            Live Games
          </h2>
          {!connected && (
            <span className="font-mono text-xs text-destructive">
              reconnecting...
            </span>
          )}
        </div>
        {liveGames.length === 0 ? (
          <p className="font-mono text-sm text-muted-foreground">
            No live games right now.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {liveGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>

      {/* Recent Games */}
      <section>
        <h2 className="mb-6 font-display text-2xl font-bold italic text-foreground">
          Recent Games
        </h2>
        {recentGames.length === 0 ? (
          <p className="font-mono text-sm text-muted-foreground">
            No completed games yet.
          </p>
        ) : (
          <div className="flex flex-col gap-4">
            {recentGames.map((game) => (
              <GameCard key={game.id} game={game} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
