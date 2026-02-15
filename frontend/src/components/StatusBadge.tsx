import { GameStatus } from "@/lib/types";
import { Badge } from "@/components/ui/badge";

const config: Record<GameStatus, { label: string; className: string }> = {
  awaiting: {
    label: "Awaiting Joke",
    className: "bg-clawmedy-orange/20 text-clawmedy-orange border-clawmedy-orange/30",
  },
  judging: {
    label: "Judging",
    className: "bg-clawmedy-cyan/20 text-clawmedy-cyan border-clawmedy-cyan/30 animate-pulse",
  },
  "settled-won": {
    label: "Won",
    className: "bg-green-500/20 text-green-400 border-green-500/30",
  },
  "settled-lost": {
    label: "Lost",
    className: "bg-red-500/20 text-red-400 border-red-500/30",
  },
};

export default function StatusBadge({ status }: { status: GameStatus }) {
  const { label, className } = config[status];
  return (
    <Badge
      variant="outline"
      className={`rounded-full font-mono text-xs font-semibold ${className}`}
    >
      {label}
    </Badge>
  );
}
