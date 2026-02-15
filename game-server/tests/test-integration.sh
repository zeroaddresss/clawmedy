#!/bin/bash
set -euo pipefail

PASS=0
FAIL=0
SKIP=0

assert_ok() {
  local desc="$1"
  shift
  if "$@" > /dev/null 2>&1; then
    echo "  ✓ $desc"; PASS=$((PASS + 1))
  else
    echo "  ✗ $desc"; FAIL=$((FAIL + 1))
  fi
}

assert_skip() {
  local desc="$1"
  echo "  - $desc (SKIPPED)"; SKIP=$((SKIP + 1))
}

assert_status() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✓ $desc"; PASS=$((PASS + 1))
  else
    echo "  ✗ $desc (expected $expected, got $actual)"; FAIL=$((FAIL + 1))
  fi
}

echo "=== Integration Tests ==="
echo ""

# --- Test 1: TypeScript compiles ---
echo "1. TypeScript compilation"
assert_ok "TypeScript compiles without errors" bash -c "cd /root/zelig/game-server && npx tsc --noEmit"

# --- Test 2: games.json is valid JSON ---
echo "2. games.json validity"
if [ -f /root/zelig/game-server/data/games.json ]; then
  assert_ok "games.json is valid JSON" jq . /root/zelig/game-server/data/games.json
else
  assert_skip "games.json does not exist"
fi

# --- Test 3: leaderboard.json is valid JSON ---
echo "3. leaderboard.json validity"
if [ -f /root/zelig/game-server/data/leaderboard.json ]; then
  assert_ok "leaderboard.json is valid JSON" jq . /root/zelig/game-server/data/leaderboard.json
else
  assert_skip "leaderboard.json does not exist"
fi

# --- Test 4: Tool scripts are executable ---
echo "4. Tool scripts executable"
TOOL_DIR="/root/zelig/judge-workspace/tools"
assert_ok "get-player-history.sh is executable" test -x "$TOOL_DIR/get-player-history.sh"
assert_ok "get-leaderboard.sh is executable" test -x "$TOOL_DIR/get-leaderboard.sh"
assert_ok "get-recent-themes.sh is executable" test -x "$TOOL_DIR/get-recent-themes.sh"
assert_ok "settle-game.sh is executable" test -x "$TOOL_DIR/settle-game.sh"
assert_ok "remember-joke.sh is executable" test -x "$TOOL_DIR/remember-joke.sh"

# --- Test 5: SOUL.md contains tool usage ---
echo "5. SOUL.md tool usage section"
assert_ok "SOUL.md contains tool usage reference" grep -iq "tool" /root/zelig/judge-workspace/SOUL.md

# --- Test 6: TOOLS.md describes 5 tools ---
echo "6. TOOLS.md tool descriptions"
assert_ok "TOOLS.md describes settle-game" grep -q "settle-game" /root/zelig/judge-workspace/TOOLS.md
assert_ok "TOOLS.md describes remember-joke" grep -q "remember-joke" /root/zelig/judge-workspace/TOOLS.md
assert_ok "TOOLS.md describes get-player-history" grep -q "get-player-history" /root/zelig/judge-workspace/TOOLS.md
assert_ok "TOOLS.md describes get-leaderboard" grep -q "get-leaderboard" /root/zelig/judge-workspace/TOOLS.md
assert_ok "TOOLS.md describes get-recent-themes" grep -q "get-recent-themes" /root/zelig/judge-workspace/TOOLS.md

# --- Test 7: HEARTBEAT.md not empty ---
echo "7. HEARTBEAT.md content"
assert_ok "HEARTBEAT.md is not empty" test -s /root/zelig/judge-workspace/HEARTBEAT.md

# --- Test 8: MEMORY.md template present ---
echo "8. MEMORY.md template"
assert_ok "MEMORY.md exists and is not empty" test -s /root/zelig/judge-workspace/MEMORY.md

# --- Test 9: memory/ directory exists ---
echo "9. memory/ directory"
assert_ok "memory/ directory exists" test -d /root/zelig/judge-workspace/memory

# --- Test 10: Internal recent-themes endpoint ---
echo "10. Internal recent-themes roundtrip"
THEMES_FILE=$(mktemp)
if curl -s --max-time 5 http://localhost:3001/internal/recent-themes > "$THEMES_FILE" 2>/dev/null; then
  assert_ok "/internal/recent-themes returns valid JSON" jq . "$THEMES_FILE"
  assert_ok "/internal/recent-themes returns an array" jq -e 'type == "array"' "$THEMES_FILE"
else
  echo "  ✗ /internal/recent-themes endpoint unreachable"; ((FAIL++))
fi
rm -f "$THEMES_FILE"

# --- Test 11: README no obsolete refs ---
echo "11. README.md no obsolete references"
OBSOLETE_COUNT=$(grep -c -E "Hardhat|judge-wrapper|JUDGE_URL|TO_BE_DEPLOYED" /root/zelig/README.md 2>/dev/null || true)
OBSOLETE_COUNT=${OBSOLETE_COUNT:-0}
assert_status "README.md has no obsolete references" "0" "$OBSOLETE_COUNT"

# --- Test 12: SKILL.md correct addresses ---
echo "12. SKILL.md contract addresses"
assert_ok "SKILL.md contains ClawmedyToken address (0x4C7a6Ee)" grep -q "0x4C7a6Ee" /root/zelig/SKILL.md
assert_ok "SKILL.md contains ArenaRewards address" grep -q "ArenaRewards" /root/zelig/SKILL.md

# --- Test 13: WebSocket connection ---
echo "13. WebSocket connectivity"
WS_RESULT=$(cd /root/zelig/game-server && node -e "
const WebSocket = require('ws');
const ws = new WebSocket('ws://localhost:3001/ws');
const timeout = setTimeout(() => { console.log('TIMEOUT'); process.exit(1); }, 5000);
ws.on('open', () => { clearTimeout(timeout); console.log('CONNECTED'); ws.close(); process.exit(0); });
ws.on('error', (e) => { clearTimeout(timeout); console.log('ERROR: ' + e.message); process.exit(1); });
" 2>&1)
assert_status "WebSocket connects successfully" "CONNECTED" "$WS_RESULT"

# --- Summary ---
echo ""
echo "=== Results ==="
TOTAL=$((PASS + FAIL))
echo "  Passed: $PASS / $TOTAL"
if [ "$SKIP" -gt 0 ]; then
  echo "  Skipped: $SKIP"
fi
if [ "$FAIL" -gt 0 ]; then
  echo "  Failed: $FAIL"
  exit 1
else
  echo "  All tests passed!"
  exit 0
fi
