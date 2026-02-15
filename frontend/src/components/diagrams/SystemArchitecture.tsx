export default function SystemArchitecture() {
  const muted = "oklch(0.5 0.02 270)";
  const fg = "oklch(0.95 0.01 270)";
  const nodeFill = "oklch(0 0 0 / 0.5)";

  const colors = {
    cyan: "oklch(0.83 0.12 200)",
    magenta: "oklch(0.72 0.18 340)",
    purple: "oklch(0.7 0.25 270)",
    orange: "oklch(0.78 0.14 65)",
    green: "oklch(0.75 0.18 145)",
  };

  return (
    <div className="my-8 w-full overflow-x-auto">
      <svg
        viewBox="0 0 900 400"
        className="w-full min-w-[600px]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <marker
            id="arr-sys"
            viewBox="0 0 10 7"
            refX="10"
            refY="3.5"
            markerWidth="8"
            markerHeight="6"
            orient="auto-start-reverse"
          >
            <path d="M 0 0 L 10 3.5 L 0 7" fill="none" stroke={muted} strokeWidth="1" />
          </marker>
        </defs>

        <style>{`
          .sys-node { transition: filter 0.2s ease; cursor: default; }
          .sys-node:hover { filter: drop-shadow(0 0 12px var(--glow)); }
        `}</style>

        {/* ── Nodes ── */}

        {/* Frontend */}
        <g className="sys-node" style={{ "--glow": colors.cyan } as React.CSSProperties}>
          <rect x="30" y="150" width="140" height="56" rx="10" fill={nodeFill} stroke={colors.cyan} strokeWidth="1.5" />
          <rect x="30" y="150" width="4" height="56" rx="2" fill={colors.cyan} />
          <text x="100" y="183" textAnchor="middle" fill={fg} fontFamily="monospace" fontSize="13" fontWeight="600">Frontend</text>
        </g>

        {/* Game Server */}
        <g className="sys-node" style={{ "--glow": colors.magenta } as React.CSSProperties}>
          <rect x="240" y="150" width="160" height="56" rx="10" fill={nodeFill} stroke={colors.magenta} strokeWidth="1.5" />
          <rect x="240" y="150" width="4" height="56" rx="2" fill={colors.magenta} />
          <text x="320" y="183" textAnchor="middle" fill={fg} fontFamily="monospace" fontSize="13" fontWeight="600">Game Server</text>
        </g>

        {/* OpenClaw Gateway */}
        <g className="sys-node" style={{ "--glow": colors.purple } as React.CSSProperties}>
          <rect x="480" y="150" width="170" height="56" rx="10" fill={nodeFill} stroke={colors.purple} strokeWidth="1.5" />
          <rect x="480" y="150" width="4" height="56" rx="2" fill={colors.purple} />
          <text x="565" y="183" textAnchor="middle" fill={fg} fontFamily="monospace" fontSize="12" fontWeight="600">OpenClaw Gateway</text>
        </g>

        {/* Judge Agent */}
        <g className="sys-node" style={{ "--glow": colors.orange } as React.CSSProperties}>
          <rect x="730" y="150" width="140" height="56" rx="10" fill={nodeFill} stroke={colors.orange} strokeWidth="1.5" />
          <rect x="730" y="150" width="4" height="56" rx="2" fill={colors.orange} />
          <text x="800" y="183" textAnchor="middle" fill={fg} fontFamily="monospace" fontSize="13" fontWeight="600">Judge Agent</text>
        </g>

        {/* Monad Blockchain */}
        <g className="sys-node" style={{ "--glow": colors.green } as React.CSSProperties}>
          <rect x="250" y="310" width="140" height="56" rx="10" fill={nodeFill} stroke={colors.green} strokeWidth="1.5" />
          <rect x="250" y="310" width="4" height="56" rx="2" fill={colors.green} />
          <text x="320" y="340" textAnchor="middle" fill={fg} fontFamily="monospace" fontSize="12" fontWeight="600">Monad Blockchain</text>
        </g>

        {/* Agent Memory */}
        <g className="sys-node" style={{ "--glow": colors.cyan } as React.CSSProperties}>
          <rect x="730" y="310" width="140" height="56" rx="10" fill={nodeFill} stroke={colors.cyan} strokeWidth="1.5" />
          <rect x="730" y="310" width="4" height="56" rx="2" fill={colors.cyan} />
          <text x="800" y="343" textAnchor="middle" fill={fg} fontFamily="monospace" fontSize="13" fontWeight="600">Agent Memory</text>
        </g>

        {/* ── Edges ── */}

        {/* Frontend → Game Server */}
        <line x1="170" y1="178" x2="236" y2="178" stroke={muted} strokeWidth="1.5" strokeDasharray="6 4" markerEnd="url(#arr-sys)" />
        <text x="203" y="168" textAnchor="middle" fill={muted} fontFamily="monospace" fontSize="10">REST / WS</text>

        {/* Game Server → OpenClaw */}
        <line x1="400" y1="178" x2="476" y2="178" stroke={muted} strokeWidth="1.5" strokeDasharray="6 4" markerEnd="url(#arr-sys)" />
        <text x="438" y="168" textAnchor="middle" fill={muted} fontFamily="monospace" fontSize="10">HTTP</text>

        {/* OpenClaw → Judge */}
        <line x1="650" y1="178" x2="726" y2="178" stroke={muted} strokeWidth="1.5" strokeDasharray="6 4" markerEnd="url(#arr-sys)" />
        <text x="688" y="168" textAnchor="middle" fill={muted} fontFamily="monospace" fontSize="10">A2A</text>

        {/* Game Server → Blockchain */}
        <line x1="320" y1="206" x2="320" y2="306" stroke={muted} strokeWidth="1.5" strokeDasharray="6 4" markerEnd="url(#arr-sys)" />
        <text x="350" y="260" fill={muted} fontFamily="monospace" fontSize="10">verify / settle</text>

        {/* Judge → Memory */}
        <line x1="800" y1="206" x2="800" y2="306" stroke={muted} strokeWidth="1.5" strokeDasharray="6 4" markerEnd="url(#arr-sys)" />
        <text x="835" y="260" fill={muted} fontFamily="monospace" fontSize="10">read / write</text>
      </svg>
    </div>
  );
}
