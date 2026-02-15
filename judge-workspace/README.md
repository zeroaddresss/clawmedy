# Judge Clawsworth III — Agent Workspace

This directory contains the OpenClaw agent configuration for Judge Clawsworth III, the supreme comedy adjudicator of the Clawmedy Arena.

## Architecture

```mermaid
graph TD
    GS[Game Server :3001] -->|POST /v1/chat/completions| OC[OpenClaw Gateway :18789]
    OC --> JA[Judge Clawsworth III Agent]
    JA -->|get-player-history.sh| INT[Game Server /internal/*]
    JA -->|get-leaderboard.sh| INT
    JA -->|get-recent-themes.sh| INT
    JA -->|settle-game.sh| INT
    JA -->|remember-joke.sh| MEM[memory/YYYY-MM-DD.md]
    INT -->|settleGame()| BC[Monad Blockchain]
    INT -->|read/write| STORE[Game & Leaderboard Stores]
```

## Agent Files

| File | Purpose |
|------|---------|
| `SOUL.md` | Personality, scoring rules, anti-injection rules, tool usage instructions |
| `TOOLS.md` | Description of all 5 available tools with parameters and examples |
| `HEARTBEAT.md` | Periodic tasks: scoring calibration, theme rotation, memory consolidation |
| `AGENTS.md` | Operating principles: autonomy, decision authority, security |
| `MEMORY.md` | Persistent memory: scoring calibration, joke patterns, player notes |

## Tools

| Tool | Script | Purpose |
|------|--------|---------|
| get-player-history | `tools/get-player-history.sh` | Retrieve a player's recent game history |
| get-leaderboard | `tools/get-leaderboard.sh` | Get current arena leaderboard |
| get-recent-themes | `tools/get-recent-themes.sh` | List recently used themes (avoid repeats) |
| settle-game | `tools/settle-game.sh` | Execute on-chain game settlement |
| remember-joke | `tools/remember-joke.sh` | Log evaluation to daily memory file |

## Memory System

- **MEMORY.md**: Persistent summary — scoring calibration, patterns, player notes, theme history
- **memory/**: Daily log files (`YYYY-MM-DD.md`) created by `remember-joke` tool
- **Consolidation**: During heartbeat, daily logs are consolidated into MEMORY.md and stale entries are pruned

## Heartbeat

The agent runs periodic heartbeat tasks to:
1. Check scoring distribution against the 80/15/4/1 target
2. Review theme rotation to prevent repetition
3. Consolidate daily memory logs into MEMORY.md
4. Detect anomalies (spam, prompt injection attempts, suspicious patterns)

## Evaluation Flow

1. Game server sends joke + rich context (gameId, wallet, prize, theme)
2. Agent calls `get-player-history` to check the player's track record
3. Agent consults MEMORY.md for patterns and player notes
4. Agent judges the joke per SOUL.md scoring rules
5. Agent calls `settle-game` to execute on-chain settlement
6. Agent calls `remember-joke` to log the evaluation
7. Agent returns JSON verdict: `{score, reaction, reasoning, won}`
