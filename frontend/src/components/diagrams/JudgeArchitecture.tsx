export default function JudgeArchitecture() {
  const muted = "oklch(0.5 0.02 270)";
  const fg = "oklch(0.95 0.01 270)";
  const nodeFill = "oklch(0 0 0 / 0.5)";
  const pillFill = "oklch(0.08 0.02 270 / 0.8)";

  const colors = {
    cyan: "oklch(0.83 0.12 200)",
    magenta: "oklch(0.72 0.18 340)",
    purple: "oklch(0.7 0.25 270)",
    orange: "oklch(0.78 0.14 65)",
    green: "oklch(0.75 0.18 145)",
  };

  const tools = [
    { label: "get-player-history", cx: 105 },
    { label: "get-leaderboard", cx: 270 },
    { label: "get-recent-themes", cx: 450 },
    { label: "settle-game", cx: 620 },
    { label: "remember-joke", cx: 790 },
  ];

  return (
    <div className="my-8 w-full overflow-x-auto">
      <svg
        viewBox="0 0 900 480"
        className="w-full min-w-[600px]"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <marker
            id="arr-j"
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
          .jdg-node { transition: filter 0.2s ease; cursor: default; }
          .jdg-node:hover { filter: drop-shadow(0 0 12px var(--glow)); }
          .jdg-pill { transition: filter 0.15s ease; cursor: default; }
          .jdg-pill:hover { filter: drop-shadow(0 0 8px var(--glow)); }
        `}</style>

        {/* ── Top Row ── */}

        {/* Game Server */}
        <g className="jdg-node" style={{ "--glow": colors.magenta } as React.CSSProperties}>
          <rect x="40" y="30" width="155" height="52" rx="10" fill={nodeFill} stroke={colors.magenta} strokeWidth="1.5" />
          <rect x="40" y="30" width="4" height="52" rx="2" fill={colors.magenta} />
          <text x="117" y="61" textAnchor="middle" fill={fg} fontFamily="monospace" fontSize="13" fontWeight="600">Game Server</text>
        </g>

        {/* OpenClaw */}
        <g className="jdg-node" style={{ "--glow": colors.purple } as React.CSSProperties}>
          <rect x="290" y="30" width="145" height="52" rx="10" fill={nodeFill} stroke={colors.purple} strokeWidth="1.5" />
          <rect x="290" y="30" width="4" height="52" rx="2" fill={colors.purple} />
          <text x="362" y="61" textAnchor="middle" fill={fg} fontFamily="monospace" fontSize="13" fontWeight="600">OpenClaw</text>
        </g>

        {/* Judge Clawsworth III */}
        <g className="jdg-node" style={{ "--glow": colors.orange } as React.CSSProperties}>
          <rect x="530" y="22" width="230" height="66" rx="12" fill={nodeFill} stroke={colors.orange} strokeWidth="2" />
          <rect x="530" y="22" width="5" height="66" rx="2" fill={colors.orange} />
          <text x="645" y="52" textAnchor="middle" fill={fg} fontFamily="monospace" fontSize="12" fontWeight="700">Judge Clawsworth III</text>
          <text x="645" y="72" textAnchor="middle" fill={muted} fontFamily="monospace" fontSize="10">AI Comedy Judge</text>
        </g>

        {/* Top row edges */}
        <line x1="195" y1="56" x2="286" y2="56" stroke={muted} strokeWidth="1.5" strokeDasharray="6 4" markerEnd="url(#arr-j)" />
        <text x="240" y="48" textAnchor="middle" fill={muted} fontFamily="monospace" fontSize="10">HTTP</text>

        <line x1="435" y1="56" x2="526" y2="56" stroke={muted} strokeWidth="1.5" strokeDasharray="6 4" markerEnd="url(#arr-j)" />
        <text x="480" y="48" textAnchor="middle" fill={muted} fontFamily="monospace" fontSize="10">A2A</text>

        {/* ── "bash tool calls" label ── */}
        <text x="450" y="120" textAnchor="middle" fill={muted} fontFamily="monospace" fontSize="11" fontStyle="italic">bash tool calls</text>

        {/* ── Fan-out lines from Judge to tools ── */}
        {tools.map((tool) => (
          <line
            key={tool.label}
            x1="645"
            y1="88"
            x2={tool.cx}
            y2="160"
            stroke={muted}
            strokeWidth="1"
            strokeDasharray="4 3"
            markerEnd="url(#arr-j)"
          />
        ))}

        {/* ── Tool call pills ── */}
        {tools.map((tool) => {
          const w = tool.label.length * 8 + 24;
          const x = tool.cx - w / 2;
          return (
            <g key={tool.label} className="jdg-pill" style={{ "--glow": colors.purple } as React.CSSProperties}>
              <rect x={x} y="162" width={w} height="32" rx="8" fill={pillFill} stroke={colors.purple} strokeWidth="1" />
              <text x={tool.cx} y="183" textAnchor="middle" fill={fg} fontFamily="monospace" fontSize="10">{tool.label}</text>
            </g>
          );
        })}

        {/* ── Bottom Nodes ── */}

        {/* Internal API */}
        <g className="jdg-node" style={{ "--glow": colors.magenta } as React.CSSProperties}>
          <rect x="380" y="290" width="145" height="50" rx="10" fill={nodeFill} stroke={colors.magenta} strokeWidth="1.5" />
          <rect x="380" y="290" width="4" height="50" rx="2" fill={colors.magenta} />
          <text x="452" y="320" textAnchor="middle" fill={fg} fontFamily="monospace" fontSize="12" fontWeight="600">Internal API</text>
        </g>

        {/* Memory Files */}
        <g className="jdg-node" style={{ "--glow": colors.cyan } as React.CSSProperties}>
          <rect x="620" y="290" width="145" height="50" rx="10" fill={nodeFill} stroke={colors.cyan} strokeWidth="1.5" />
          <rect x="620" y="290" width="4" height="50" rx="2" fill={colors.cyan} />
          <text x="692" y="320" textAnchor="middle" fill={fg} fontFamily="monospace" fontSize="12" fontWeight="600">Memory Files</text>
        </g>

        {/* Monad Blockchain */}
        <g className="jdg-node" style={{ "--glow": colors.green } as React.CSSProperties}>
          <rect x="370" y="410" width="170" height="50" rx="10" fill={nodeFill} stroke={colors.green} strokeWidth="1.5" />
          <rect x="370" y="410" width="4" height="50" rx="2" fill={colors.green} />
          <text x="455" y="440" textAnchor="middle" fill={fg} fontFamily="monospace" fontSize="12" fontWeight="600">Monad Blockchain</text>
        </g>

        {/* ── Bottom edges ── */}

        {/* settle-game → Internal API */}
        <line x1="620" y1="194" x2="452" y2="286" stroke={muted} strokeWidth="1.5" strokeDasharray="6 4" markerEnd="url(#arr-j)" />

        {/* remember-joke → Memory Files */}
        <line x1="790" y1="194" x2="692" y2="286" stroke={muted} strokeWidth="1.5" strokeDasharray="6 4" markerEnd="url(#arr-j)" />

        {/* Internal API → Blockchain */}
        <line x1="452" y1="340" x2="452" y2="406" stroke={muted} strokeWidth="1.5" strokeDasharray="6 4" markerEnd="url(#arr-j)" />
        <text x="475" y="378" fill={muted} fontFamily="monospace" fontSize="10">on-chain</text>
      </svg>
    </div>
  );
}
