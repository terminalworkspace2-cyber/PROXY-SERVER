#!/usr/bin/env bash
set -euo pipefail

echo "Building PROXY-SERVER with LiteLLM MCP Gateway..."

mkdir -p scripts

# LiteLLM configuration
cat > config.yaml <<'YAML'
model_list: []

general_settings:
  master_key: os.environ/LITELLM_MASTER_KEY
  store_model_in_db: false

mcp_servers:
  deepwiki:
    url: https://mcp.deepwiki.com/mcp
    transport: http
    description: Free documentation and repository research
    allow_all_keys: true
YAML

# Container
cat > Dockerfile <<'DOCKER'
FROM ghcr.io/berriai/litellm:main-stable

WORKDIR /app

COPY config.yaml /app/config.yaml

EXPOSE 4000

CMD ["--config", "/app/config.yaml", "--host", "0.0.0.0", "--port", "4000"]
DOCKER

# Render deployment
cat > render.yaml <<'YAML'
services:
  - type: web
    name: litellm-mcp-gateway
    runtime: docker
    plan: starter
    dockerfilePath: ./Dockerfile
    dockerContext: .
    healthCheckPath: /health/liveliness
    autoDeploy: true
    envVars:
      - key: LITELLM_MASTER_KEY
        generateValue: true
YAML

# Docker exclusions
cat > .dockerignore <<'EOF2'
.git
.env
.env.*
*.key
*.log
node_modules
models
EOF2

# Deployment and endpoint documentation
cat > README.md <<'EOF2'
# PROXY-SERVER

OpenAI-compatible LiteLLM and MCP gateway.

## Architecture

Coding clients
    |
    v
Render LiteLLM Gateway
    |
    +---- /v1 OpenAI-compatible API
    |
    +---- /mcp MCP gateway
              |
              +---- DeepWiki MCP

DSH connects to the gateway using:
@deepseek-ai/dsh-mcp-client

## OpenAI endpoints

GET  /v1/models
POST /v1/chat/completions

## MCP endpoints

POST /mcp
POST /deepwiki/mcp

## Authentication

LITELLM_MASTER_KEY

## Deployment

Render Blueprint using render.yaml.

No model weights are deployed.
No paid inference provider keys are hardcoded.
EOF2

# Post-deployment test
cat > scripts/check-server.sh <<'EOF2'
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
EOF2

chmod +x scripts/check-server.sh

echo
echo "======================================"
echo "PROXY-SERVER FILES CREATED"
echo "======================================"
find . -maxdepth 2 -type f \
  ! -path './.git/*' | sort

echo
echo "Next: push the repository to GitHub."
