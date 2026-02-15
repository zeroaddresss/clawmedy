"use client";

import { useState } from "react";
import { Game } from "@/lib/types";
import StatusBadge from "./StatusBadge";
import ScoreBar from "./ScoreBar";
import { Card, CardContent } from "@/components/ui/card";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { AnimatePresence, motion } from "framer-motion";
import { ChevronDown, ExternalLink } from "lucide-react";

function truncateAddress(addr: string) {
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export default function GameCard({ game }: { game: Game }) {
  const [expanded, setExpanded] = useState(false);

  const isSettled =
    game.status === "settled-won" || game.status === "settled-lost";
  const won = game.status === "settled-won";

  // Use streamingResponse if available (live streaming), else judgeResponse
  const displayResponse = game.streamingResponse ?? game.judgeResponse;
  const isStreaming = game.streamingResponse != null && game.status === "judging";

  const initials = game.agentName ? game.agentName.slice(0, 2).toUpperCase() : "??";

  return (
    <Collapsible open={expanded} onOpenChange={setExpanded}>
      <Card
        className={`cursor-pointer border transition-all ${
          expanded
            ? "border-primary/40 shadow-[0_0_32px_rgba(139,92,246,0.15)]"
            : "border-border hover:border-primary/30 hover:shadow-[0_0_20px_rgba(139,92,246,0.1)]"
        }`}
      >
        {/* Summary row */}
        <CollapsibleTrigger asChild>
          <div className="flex items-center justify-between px-5 py-4">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 font-mono text-sm font-bold text-primary">
                {initials}
              </div>
              <div>
                <p className="font-mono text-sm text-foreground">
                  {game.agentName || truncateAddress(game.challenger)}
                </p>
                {game.agentName && (
                  <p className="mt-0.5 text-xs text-muted-foreground/50">{truncateAddress(game.challenger)}</p>
                )}
                <p className="mt-0.5 text-sm text-muted-foreground">
                  {game.theme}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <span className="font-mono text-sm font-semibold text-foreground">
                {game.prize} $CMDY Prize
              </span>
              <StatusBadge status={game.status} />
              <ChevronDown className={`h-4 w-4 text-muted-foreground transition-transform ${expanded ? "rotate-180" : ""}`} />
            </div>
          </div>
        </CollapsibleTrigger>

        {/* Expanded content */}
        <CollapsibleContent forceMount>
          <AnimatePresence>
            {expanded && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="overflow-hidden"
              >
                <CardContent className="border-t border-border pt-4">
                  {/* Theme */}
                  <p className="mb-4 font-display text-lg font-semibold italic text-primary">
                    Theme: {game.theme}
                  </p>

                  {/* Joke */}
                  {game.joke && (
                    <div className="mb-4 rounded-lg bg-background p-4">
                      <p className="mb-1 font-mono text-xs uppercase tracking-wider text-muted-foreground">
                        Challenger&apos;s Joke
                      </p>
                      <p className="text-sm leading-relaxed text-foreground/90">
                        {game.joke}
                      </p>
                    </div>
                  )}

                  {/* Judge response (streaming or final) */}
                  {displayResponse && (
                    <div className="mb-4 rounded-lg bg-background p-4">
                      <p className="mb-1 font-mono text-xs uppercase tracking-wider text-clawmedy-cyan/60">
                        Judge Response
                      </p>
                      <p className="text-sm leading-relaxed text-foreground/80">
                        {displayResponse}
                        {isStreaming && (
                          <span className="animate-pulse text-primary">|</span>
                        )}
                      </p>
                    </div>
                  )}

                  {/* Score + reasoning + outcome */}
                  {isSettled && game.score !== undefined && (
                    <div>
                      <div className="flex items-end gap-6">
                        <div className="flex-1">
                          <ScoreBar score={game.score} />
                        </div>
                        <div
                          className={`rounded-lg px-4 py-2 font-mono text-sm font-bold ${
                            won
                              ? "bg-green-500/20 text-green-400"
                              : "bg-red-500/20 text-red-400"
                          }`}
                        >
                          {won ? `+${game.prize} $CMDY` : "Lost"}
                        </div>
                      </div>

                      {/* Payout tx link */}
                      {won && game.settlementTxHash && (
                        <a
                          href={`https://monad.socialscan.io/tx/${game.settlementTxHash}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          onClick={(e) => e.stopPropagation()}
                          className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-green-500/10 px-3 py-1.5 font-mono text-xs font-semibold text-green-400 transition-colors hover:bg-green-500/20"
                        >
                          View Payout TX
                          <ExternalLink className="h-3 w-3" />
                        </a>
                      )}

                      {/* Reasoning (shown prominently below score) */}
                      {game.reasoning && (
                        <div className="mt-3 rounded-lg border-l-2 border-primary/30 bg-primary/5 px-4 py-3">
                          <p className="mb-1 font-mono text-xs uppercase tracking-wider text-primary/60">
                            Judge&apos;s Reasoning
                          </p>
                          <p className="text-sm leading-relaxed text-foreground/80">
                            {game.reasoning}
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Awaiting state */}
                  {game.status === "awaiting" && (
                    <p className="text-center font-mono text-sm text-muted-foreground">
                      Waiting for challenger to submit a joke...
                    </p>
                  )}
                </CardContent>
              </motion.div>
            )}
          </AnimatePresence>
        </CollapsibleContent>
      </Card>
    </Collapsible>
  );
}
