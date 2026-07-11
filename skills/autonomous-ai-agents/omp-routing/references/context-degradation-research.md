# Context Degradation Research

## Key Papers

### Du et al. (2025) — "Context Length Alone Hurts LLM Performance Despite Perfect Retrieval"
- **Finding:** Performance drops 13.9%–85% as input length increases, even with perfect retrieval and masked irrelevant tokens
- **Key insight:** "The sheer length of the input alone can hurt LLM performance, independent of retrieval quality and without any distraction"
- **Mitigation:** Transform long-context tasks into short-context ones by prompting the model to recite retrieved evidence before solving
- **Source:** https://arxiv.org/html/2510.05381

### Wang et al. (2026) — "Intelligence Degradation in Long-Context LLMs"
- **Finding:** Critical threshold at 40-50% of maximum context length for Qwen2.5-7B
- **Degradation:** F1 scores drop from 0.55-0.56 to 0.3 (45.5% degradation) beyond threshold
- **Pattern:** "Shallow long-context adaptation" — models work fine up to threshold, then collapse catastrophically
- **Source:** https://arxiv.org/html/2601.15300

### Liu et al. (2023) — "Lost in the Middle"
- **Finding:** U-shaped attention curve — strong at start/end of context, weak in middle
- **Structural cause:** Inherent in transformer architectures with residual connections; creates a "dead zone" for information processing
- **Source:** https://arxiv.org/html/2307.03172

## Industry Practice

### Claude Code (Anthropic, 2026)
- Triggers compaction at **95% of 200k window** (default)
- For reasoning-heavy tasks: recommends **50-70%** via `CLAUDE_AUTOCOMPACT_PCT_OVERRIDE`
- Uses multi-tier cascade: auto-summarization → history sniping → context collapse
- Source: https://platform.claude.com/cookbook/tool-use-context-engineering-context-engineering-tools

### Context Engineering Best Practices (2025-2026)
- Trigger at **80% of EFFECTIVE window** (not advertised window)
- Observation masking (clearing tool results) often beats LLM summarization for cost/performance
- Aggressive summarization can paradoxically lengthen agent trajectories
- Effective reasoning window often much smaller than advertised: "under 128k-256k tokens" for high-fidelity work
- Source: https://tianpan.co/blog/2026-02-26-context-engineering-memory-compaction-tool-clearing

## Practical Thresholds

| Model Class | Advertised Max | Safe Operating Zone | Compression Trigger |
|-------------|---------------|---------------------|---------------------|
| Small (7B) | 32k-128k | <20k tokens | 30-50% of effective |
| Medium (70B) | 128k-256k | <50k tokens | 30-50% of effective |
| Large (400B+) | 200k-1M | <50-128k tokens | 30% or threshold_tokens cap |

## Applied to MiMo V2.5

- MiMo V2.5 **actual limit**: 200k tokens (opencode-go plan advertises 1M)
- Degradation cliff: 40-50% of 200k = **80-100k tokens**
- System prompt + tools + codebase ≈ 25k tokens
- Safe working room: **~55-75k tokens** before compaction

## Hermes Agent Config

Default compression settings (from `~/.hermes/config.yaml`):
```yaml
compression:
  enabled: true
  threshold: 0.50          # Global percentage-based trigger (default)
  threshold_tokens: null   # Global absolute token override (default: disabled)
  target_ratio: 0.20       # Tail protection budget
  protect_last_n: 20       # Minimum recent messages preserved
```

**Problem:** With 1M context models, `threshold: 0.50` = 500k tokens before compaction. Deep in degradation zone. Even with MiMo's 200k, default `threshold: 0.50` = 100k which is right at the cliff.

**Fix:** Set explicit `threshold_tokens: 100000` and keep `threshold: 0.50` (50% of 200k). See `templates/omp-full-config.yaml` for the complete config.

## Notion Research DB Entry
- Page: "LLM Context Length Degradation: Beyond Retrieval Failures"
- ID: 39510db4-1d13-81c2-a80b-de479a1dd036
- Tags: AI, LLM, context-management, agent-engineering
- Year: 2025
