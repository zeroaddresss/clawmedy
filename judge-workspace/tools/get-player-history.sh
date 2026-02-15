#!/bin/bash
# Usage: get-player-history.sh <wallet_address> [limit]
# Returns: JSON array of player's recent games with scores, jokes, themes
WALLET="$1"
LIMIT="${2:-10}"
curl -s "http://localhost:3001/internal/player-history?wallet=${WALLET}&limit=${LIMIT}"
