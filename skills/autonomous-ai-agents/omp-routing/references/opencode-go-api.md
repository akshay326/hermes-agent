# OpenCode Go API Reference

## Endpoint
```
POST https://opencode.ai/zen/go/v1/chat/completions
```

## Authentication
```
Authorization: Bearer $OPENCODE_API_KEY
Content-Type: application/json
```

## Model IDs
- GLM-5.2: `glm-5.2` (returned as `frank/GLM-5.2`)
- MiMo v2.5: Available via OpenCode Go (check current model list)

## Request Format
```json
{
  "model": "glm-5.2",
  "messages": [
    { "role": "system", "content": "You are a planner model." },
    { "role": "user", "content": "your question" }
  ],
  "max_tokens": 2000
}
```

## Response Format
```json
{
  "model": "frank/GLM-5.2",
  "choices": [{
    "message": {
      "role": "assistant",
      "content": "final answer",
      "reasoning_content": "step-by-step thinking"
    }
  }],
  "usage": {
    "total_tokens": 736,
    "cost": 0.00349
  }
}
```

## Key Notes
- `reasoning_content` field contains the model's step-by-step thinking
- Cost is included in response (but OpenCode Go is $5/mo flat rate)
- Model supports streaming (not yet tested in scripts)

## Env Variable
- Correct: `OPENCODE_API_KEY` (NOT `OPENCODE_GO_API_KEY`)
- Location: `/workspace/.env`

## Proxy Reference
Source: `github.com/routatic/proxy` — see `internal/client/opencode.go` for full implementation.
Default base URLs:
- Chat: `https://opencode.ai/zen/go/v1/chat/completions`
- Messages (Anthropic): `https://opencode.ai/zen/go/v1/messages`
