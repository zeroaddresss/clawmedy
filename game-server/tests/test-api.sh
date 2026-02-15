#!/bin/bash
set -euo pipefail

PASS=0; FAIL=0; BASE="http://localhost:3001"

assert_status() {
  local desc="$1" expected="$2" actual="$3"
  if [ "$expected" = "$actual" ]; then
    echo "  ✓ $desc"; ((PASS++)) || true
  else
    echo "  ✗ $desc (expected $expected, got $actual)"; ((FAIL++)) || true
  fi
}

assert_json_field() {
  local desc="$1" json="$2" field="$3"
  if echo "$json" | jq -e ".$field" > /dev/null 2>&1; then
    echo "  ✓ $desc"; ((PASS++)) || true
  else
    echo "  ✗ $desc (field .$field missing)"; ((FAIL++)) || true
  fi
}

echo "=== Game Server REST API Tests ==="
echo ""

# ---------------------------------------------------------------------------
# Test 1: Health check
# ---------------------------------------------------------------------------
echo "Test 1: Health check (GET /health)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/health")
assert_status "GET /health returns 200" "200" "$STATUS"

BODY=$(curl -s "$BASE/health")
assert_json_field "response has uptime" "$BODY" "uptime"
assert_json_field "response has status" "$BODY" "status"
assert_json_field "response has timestamp" "$BODY" "timestamp"

# ---------------------------------------------------------------------------
# Test 2: Stats
# ---------------------------------------------------------------------------
echo ""
echo "Test 2: Stats (GET /api/stats)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/stats")
assert_status "GET /api/stats returns 200" "200" "$STATUS"

BODY=$(curl -s "$BASE/api/stats")
assert_json_field "response has totalGames" "$BODY" "totalGames"
assert_json_field "response has activeGames" "$BODY" "activeGames"
assert_json_field "response has totalPrizesAwarded" "$BODY" "totalPrizesAwarded"

# ---------------------------------------------------------------------------
# Test 3: Leaderboard
# ---------------------------------------------------------------------------
echo ""
echo "Test 3: Leaderboard (GET /api/leaderboard)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/leaderboard")
assert_status "GET /api/leaderboard returns 200" "200" "$STATUS"

BODY=$(curl -s "$BASE/api/leaderboard")
assert_json_field "response has leaderboard array" "$BODY" "leaderboard"

# Verify leaderboard is an array
if echo "$BODY" | jq -e '.leaderboard | type == "array"' > /dev/null 2>&1; then
  echo "  ✓ leaderboard is an array"; ((PASS++)) || true
else
  echo "  ✗ leaderboard is not an array"; ((FAIL++)) || true
fi

# ---------------------------------------------------------------------------
# Test 4: Leaderboard limit
# ---------------------------------------------------------------------------
echo ""
echo "Test 4: Leaderboard with limit (GET /api/leaderboard?limit=3)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/leaderboard?limit=3")
assert_status "GET /api/leaderboard?limit=3 returns 200" "200" "$STATUS"

BODY=$(curl -s "$BASE/api/leaderboard?limit=3")
COUNT=$(echo "$BODY" | jq '.leaderboard | length')
if [ "$COUNT" -le 3 ]; then
  echo "  ✓ leaderboard has <= 3 entries (got $COUNT)"; ((PASS++)) || true
else
  echo "  ✗ leaderboard has more than 3 entries (got $COUNT)"; ((FAIL++)) || true
fi

# ---------------------------------------------------------------------------
# Test 5: Games list
# ---------------------------------------------------------------------------
echo ""
echo "Test 5: Games list (GET /api/games)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/games")
assert_status "GET /api/games returns 200" "200" "$STATUS"

BODY=$(curl -s "$BASE/api/games")
assert_json_field "response has games" "$BODY" "games"
assert_json_field "response has total" "$BODY" "total"
assert_json_field "response has limit" "$BODY" "limit"
assert_json_field "response has offset" "$BODY" "offset"

# ---------------------------------------------------------------------------
# Test 6: Games filter
# ---------------------------------------------------------------------------
echo ""
echo "Test 6: Games filter (GET /api/games?status=settled&limit=5)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/games?status=settled&limit=5")
assert_status "GET /api/games?status=settled&limit=5 returns 200" "200" "$STATUS"

BODY=$(curl -s "$BASE/api/games?status=settled&limit=5")
assert_json_field "filtered response has games" "$BODY" "games"

# ---------------------------------------------------------------------------
# Test 7: Game not found
# ---------------------------------------------------------------------------
echo ""
echo "Test 7: Game not found (GET /api/games/nonexistent)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" "$BASE/api/games/nonexistent")
assert_status "GET /api/games/nonexistent returns 404" "404" "$STATUS"

# ---------------------------------------------------------------------------
# Test 8: Create game — no body
# ---------------------------------------------------------------------------
echo ""
echo "Test 8: Create game with empty body (POST /api/games)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{}' "$BASE/api/games")
assert_status "POST /api/games with {} returns 400" "400" "$STATUS"

# ---------------------------------------------------------------------------
# Test 9: Create game — bad wallet
# ---------------------------------------------------------------------------
echo ""
echo "Test 9: Create game with bad wallet (POST /api/games)"
sleep 2  # avoid rate limiting from rapid POST requests
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" -d '{"walletAddress":"xxx"}' "$BASE/api/games")
assert_status "POST /api/games with bad wallet returns 400" "true" \
  "$([ "$STATUS" = "400" ] || [ "$STATUS" = "429" ] && echo true || echo false)"

# ---------------------------------------------------------------------------
# Test 10: Joke submission — game not found
# ---------------------------------------------------------------------------
echo ""
echo "Test 10: Joke for nonexistent game (POST /api/games/nonexistent/joke)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"joke":"test"}' "$BASE/api/games/nonexistent/joke")
assert_status "POST /api/games/nonexistent/joke returns 404" "404" "$STATUS"

# ---------------------------------------------------------------------------
# Test 11: Joke submission — no body
# ---------------------------------------------------------------------------
echo ""
echo "Test 11: Joke with no joke field (POST /api/games/someid/joke)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{}' "$BASE/api/games/someid/joke")
assert_status "POST /api/games/someid/joke with {} returns 400 or 404" "true" \
  "$([ "$STATUS" = "400" ] || [ "$STATUS" = "404" ] && echo true || echo false)"

# ---------------------------------------------------------------------------
# Test 12: Joke submission — empty joke
# ---------------------------------------------------------------------------
echo ""
echo "Test 12: Joke with empty string (POST /api/games/someid/joke)"
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d '{"joke":""}' "$BASE/api/games/someid/joke")
assert_status "POST /api/games/someid/joke with empty joke returns 400 or 404" "true" \
  "$([ "$STATUS" = "400" ] || [ "$STATUS" = "404" ] && echo true || echo false)"

# ---------------------------------------------------------------------------
# Test 13: Joke submission — too long (501 chars)
# ---------------------------------------------------------------------------
echo ""
echo "Test 13: Joke too long (POST /api/games/someid/joke)"
LONG_JOKE=$(python3 -c "print('A' * 501)")
STATUS=$(curl -s -o /dev/null -w "%{http_code}" -X POST -H "Content-Type: application/json" \
  -d "{\"joke\":\"$LONG_JOKE\"}" "$BASE/api/games/someid/joke")
assert_status "POST /api/games/someid/joke with 501-char joke returns 400 or 404" "true" \
  "$([ "$STATUS" = "400" ] || [ "$STATUS" = "404" ] && echo true || echo false)"

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------
echo ""
echo "==================================="
echo "Results: $PASS passed, $FAIL failed"
echo "==================================="

if [ "$FAIL" -gt 0 ]; then
  exit 1
fi
