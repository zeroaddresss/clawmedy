#!/bin/bash
# Usage: get-recent-themes.sh [limit]
# Returns: JSON array of recently used themes (to avoid repetition)
LIMIT="${1:-20}"
curl -s "http://localhost:3001/internal/recent-themes?limit=${LIMIT}"
