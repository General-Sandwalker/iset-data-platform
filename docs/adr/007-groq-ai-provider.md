# ADR 007: Groq AI as Sole LLM Provider

## Status

Accepted

## Context

The platform uses AI for three features: table schema suggestion, survey generation, and chart/report generation. We considered:
1. **OpenAI GPT-4** — Most capable, higher cost
2. **Groq (LPU inference)** — Fast inference, competitive quality, lower cost
3. **Multi-provider** — Abstract AI calls to support multiple providers
4. **Self-hosted LLM** — Full control, high infrastructure cost

## Decision

We chose **Groq** as the sole AI provider, using the `qwen/qwen3-32b` model via the OpenAI-compatible chat completions API. The integration is direct (no abstraction layer) with a single `groqChat()` function.

## Consequences

**Positive:**
- Extremely fast inference (LPU architecture) — near-instant suggestions
- OpenAI-compatible API — easy to swap providers later if needed
- Low cost compared to GPT-4
- Single model choice simplifies prompt engineering
- AI is optional — all features work without a Groq API key

**Negative:**
- Vendor lock-in to Groq
- No fallback if Groq is down (endpoints return 502)
- Rate limits on the Groq side (beyond our app-level 50/hour limit)
- Model quality may differ from GPT-4 for complex prompts

**Mitigations:**
- AI features are non-critical — the platform is fully functional without AI
- `groqChat()` uses the standard OpenAI chat format, making migration straightforward
- All AI responses are validated and sanitized — invalid outputs get clear error messages
- Rate limiting prevents quota exhaustion
