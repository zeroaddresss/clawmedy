#!/bin/bash
# Usage: get-leaderboard.sh [limit]
# Returns: JSON array of top players with stats
LIMIT="${1:-20}"
curl -s "http://localhost:3001/internal/leaderboard?limit=${LIMIT}"
