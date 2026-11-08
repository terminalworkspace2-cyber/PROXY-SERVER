#!/usr/bin/env bash
set -euo pipefail

BASE="${1:?Usage: ./scripts/check-server.sh https://your-service.onrender.com}"
KEY="${LITELLM_MASTER_KEY:?Set LITELLM_MASTER_KEY first}"

echo "=== HEALTH ==="
curl -fsS "$BASE/health/liveliness"
echo

echo "=== MODELS ==="
curl -fsS "$BASE/v1/models" \
  -H "Authorization: Bearer $KEY"
echo

echo "=== MCP TOOL DISCOVERY ==="
curl -fsS -X POST "$BASE/mcp" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "x-litellm-api-key: Bearer $KEY" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list","params":{}}'
echo
