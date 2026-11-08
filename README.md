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
