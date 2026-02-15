#!/bin/bash
# Usage: remember-joke.sh <wallet> <score> <theme> <joke_summary>
# Appends to today's memory log for future reference
WALLET="$1"
SCORE="$2"
THEME="$3"
SUMMARY="$4"
DATE=$(date +%Y-%m-%d)
MEMORY_DIR="/root/zelig/judge-workspace/memory"
mkdir -p "$MEMORY_DIR"
echo "## ${WALLET} | Score: ${SCORE} | Theme: ${THEME}" >> "${MEMORY_DIR}/${DATE}.md"
echo "${SUMMARY}" >> "${MEMORY_DIR}/${DATE}.md"
echo "" >> "${MEMORY_DIR}/${DATE}.md"
