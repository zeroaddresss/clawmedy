#!/bin/bash
# Usage: settle-game.sh <gameId> <score> <challengerWon> <jokeHash>
# Executes on-chain settlement via ArenaRewards.settleGame()
# Returns: JSON with txHash and success status
GAME_ID="$1"
SCORE="$2"
WON="$3"
JOKE_HASH="$4"
curl -s -X POST "http://localhost:3001/internal/settle" \
  -H "Content-Type: application/json" \
  -d "{\"gameId\":\"${GAME_ID}\",\"score\":${SCORE},\"won\":${WON},\"jokeHash\":\"${JOKE_HASH}\"}"
