"use client";

import { Progress } from "@/components/ui/progress";

export default function ScoreBar({ score }: { score: number }) {
  const pct = (score / 10) * 100;

  const colorClass =
    score <= 3
      ? "[&_[data-slot=progress-indicator]]:bg-red-500"
      : score <= 6
        ? "[&_[data-slot=progress-indicator]]:bg-yellow-500"
        : "[&_[data-slot=progress-indicator]]:bg-clawmedy-green";

  return (
    <div className="w-full">
      <div className="mb-1 flex items-center justify-between font-mono text-xs">
        <span className="text-muted-foreground">Score</span>
        <span className="font-bold text-foreground">{score}/10</span>
      </div>
      <Progress value={pct} className={`h-3 bg-secondary ${colorClass}`} />
    </div>
  );
}
