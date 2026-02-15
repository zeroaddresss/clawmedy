#!/bin/bash
set -euo pipefail
PASS=0; FAIL=0; BASE="http://localhost:3001"

assert_status() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✓ $desc"; PASS=$((PASS+1))
  else
    echo "  ✗ $desc (expected $expected, got $actual)"; FAIL=$((FAIL+1))
  fi
}

assert_json_array() {
  local desc="$1" body="$2"
  if echo "$body" | jq -e 'type == "array"' > /dev/null 2>&1; then
    echo "  ✓ $desc"; PASS=$((PASS+1))
  else
    echo "  ✗ $desc (not a JSON array)"; FAIL=$((FAIL+1))
  fi
}

assert_max_length() {
  local desc="$1" body="$2" max="$3"
  local len
  len=$(echo "$body" | jq 'length')
  if [ "$len" -le "$max" ]; then
    echo "  ✓ $desc (got $len items)"; PASS=$((PASS+1))
  else
    echo "  ✗ $desc (expected <=$max, got $len)"; FAIL=$((FAIL+1))
  fi
}

assert_valid_json() {
  local desc="$1" body="$2"
  if echo "$body" | jq . > /dev/null 2>&1; then
    echo "  ✓ $desc"; PASS=$((PASS+1))
  else
    echo "  ✗ $desc (invalid JSON)"; FAIL=$((FAIL+1))
  fi
}

ZERO_WALLET="0x0000000000000000000000000000000000000000"

echo ""
echo "=== Internal API Tests ==="
echo ""

# ── 1. GET /internal/player-history without wallet param → 400
echo "1. GET /internal/player-history without wallet"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/internal/player-history")
assert_status "returns 400 without wallet" "400" "$STATUS"

# ── 2. GET /internal/player-history?wallet=0x000... → 200, JSON array
echo "2. GET /internal/player-history with wallet"
BODY=$(curl -s -w "\n%{http_code}" "$BASE/internal/player-history?wallet=$ZERO_WALLET")
STATUS=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "returns 200" "200" "$STATUS"
assert_json_array "response is JSON array" "$BODY"

# ── 3. GET /internal/player-history?wallet=0x000...&limit=3 → 200, ≤3 results
echo "3. GET /internal/player-history with limit=3"
BODY=$(curl -s -w "\n%{http_code}" "$BASE/internal/player-history?wallet=$ZERO_WALLET&limit=3")
STATUS=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "returns 200" "200" "$STATUS"
assert_max_length "at most 3 results" "$BODY" 3

# ── 4. GET /internal/leaderboard → 200, JSON array
echo "4. GET /internal/leaderboard"
BODY=$(curl -s -w "\n%{http_code}" "$BASE/internal/leaderboard")
STATUS=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "returns 200" "200" "$STATUS"
assert_json_array "response is JSON array" "$BODY"

# ── 5. GET /internal/leaderboard?limit=3 → 200, ≤3 entries
echo "5. GET /internal/leaderboard with limit=3"
BODY=$(curl -s -w "\n%{http_code}" "$BASE/internal/leaderboard?limit=3")
STATUS=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "returns 200" "200" "$STATUS"
assert_max_length "at most 3 entries" "$BODY" 3

# ── 6. GET /internal/recent-themes → 200, JSON array
echo "6. GET /internal/recent-themes"
BODY=$(curl -s -w "\n%{http_code}" "$BASE/internal/recent-themes")
STATUS=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "returns 200" "200" "$STATUS"
assert_json_array "response is JSON array" "$BODY"

# ── 7. GET /internal/recent-themes?limit=3 → 200, ≤3 entries
echo "7. GET /internal/recent-themes with limit=3"
BODY=$(curl -s -w "\n%{http_code}" "$BASE/internal/recent-themes?limit=3")
STATUS=$(echo "$BODY" | tail -1)
BODY=$(echo "$BODY" | sed '$d')
assert_status "returns 200" "200" "$STATUS"
assert_max_length "at most 3 entries" "$BODY" 3

# ── 8. POST /internal/settle without body → 400
echo "8. POST /internal/settle without body"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/internal/settle" -H "Content-Type: application/json")
assert_status "returns 400 without body" "400" "$STATUS"

# ── 9. POST /internal/settle with nonexistent gameId → 404
echo "9. POST /internal/settle with nonexistent gameId"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/internal/settle" \
  -H "Content-Type: application/json" \
  -d '{"gameId":"nonexistent-game-id","score":5,"won":false,"jokeHash":"0xabc"}')
assert_status "returns 404 for nonexistent game" "404" "$STATUS"

# ── 10. POST /internal/settle missing score field → 400
echo "10. POST /internal/settle missing score"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$BASE/internal/settle" \
  -H "Content-Type: application/json" \
  -d '{"gameId":"test-id"}')
assert_status "returns 400 without score" "400" "$STATUS"

echo ""
echo "=== Tool Script Tests ==="
echo ""

TOOLS_DIR="/root/zelig/judge-workspace/tools"

# ── 11. get-player-history.sh → valid JSON, exit 0
echo "11. Tool: get-player-history.sh"
TOOL_OUT=$("$TOOLS_DIR/get-player-history.sh" "$ZERO_WALLET" 2>&1) || true
TOOL_EXIT=$?
assert_valid_json "outputs valid JSON" "$TOOL_OUT"

# ── 12. get-leaderboard.sh → valid JSON, exit 0
echo "12. Tool: get-leaderboard.sh"
TOOL_OUT=$("$TOOLS_DIR/get-leaderboard.sh" 5 2>&1) || true
assert_valid_json "outputs valid JSON" "$TOOL_OUT"

# ── 13. get-recent-themes.sh → valid JSON, exit 0
echo "13. Tool: get-recent-themes.sh"
TOOL_OUT=$("$TOOLS_DIR/get-recent-themes.sh" 5 2>&1) || true
assert_valid_json "outputs valid JSON" "$TOOL_OUT"

# ── 14. remember-joke.sh creates file in memory/
echo "14. Tool: remember-joke.sh"
"$TOOLS_DIR/remember-joke.sh" "$ZERO_WALLET" 7 "test-theme" "A test joke summary"
TODAY=$(date +%Y-%m-%d)
MEMORY_FILE="/root/zelig/judge-workspace/memory/${TODAY}.md"
if [ -f "$MEMORY_FILE" ]; then
  echo "  ✓ memory file created at $MEMORY_FILE"; PASS=$((PASS+1))
else
  echo "  ✗ memory file not found at $MEMORY_FILE"; FAIL=$((FAIL+1))
fi

echo ""
echo "================================"
echo "Results: $PASS passed, $FAIL failed"
echo "================================"

exit $FAIL
