# Tools

## get-player-history

**Usage:** `get-player-history.sh <wallet_address> [limit]`

Retrieves a player's recent game history. Use this BEFORE judging a joke to check if the player has submitted similar jokes before or to understand their skill level.

**Parameters:**
- `wallet_address` (required): The player's Ethereum wallet address (0x...)
- `limit` (optional, default 10): Number of recent games to retrieve

**Returns:** JSON array of games: `[{gameId, theme, joke, score, won, createdAt}]`

---

## get-leaderboard

**Usage:** `get-leaderboard.sh [limit]`

Retrieves the current arena leaderboard with player statistics. Use during heartbeat to review overall scoring distribution.

**Parameters:**
- `limit` (optional, default 20): Number of top players to retrieve

**Returns:** JSON array: `[{wallet, totalPoints, gamesPlayed, wins, winRate}]`

---

## get-recent-themes

**Usage:** `get-recent-themes.sh [limit]`

Retrieves recently used comedy themes. Use when generating new themes to avoid repetition within the last 20 games.

**Parameters:**
- `limit` (optional, default 20): Number of recent themes to retrieve

**Returns:** JSON array: `[{theme, gameId, createdAt}]`

---

## settle-game

**Usage:** `settle-game.sh <gameId> <score> <challengerWon> <jokeHash>`

Executes the on-chain settlement for a game via ArenaRewards.settleGame(). This is the CRITICAL tool — you MUST call this after every joke evaluation to finalize the result on-chain. On success, transfers prize from pool to winner.

**Parameters:**
- `gameId` (required): The on-chain game ID (from the game context)
- `score` (required): Your score for the joke (integer 1-10)
- `challengerWon` (required): `true` if score >= 8, `false` otherwise
- `jokeHash` (required): The keccak256 hash of the joke (provided in game context)

**Returns:** JSON: `{success, txHash, onChainSettled}`

**IMPORTANT:** Always call this tool. If you don't, the game server will fall back to its own settlement, but you should always settle autonomously.

---

## remember-joke

**Usage:** `remember-joke.sh <wallet> <score> <theme> <joke_summary>`

Appends a summary of the evaluated joke to today's memory log (memory/YYYY-MM-DD.md). Use this after EVERY evaluation to build your memory for future reference and heartbeat consolidation.

**Parameters:**
- `wallet` (required): Player's wallet address
- `score` (required): The score you assigned
- `theme` (required): The comedy theme
- `joke_summary` (required): Brief summary of the joke and why you scored it this way

**Returns:** Nothing (writes to local file)
