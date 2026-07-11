---
name: product-research
description: "Research and recommend products (hardware, tools, gadgets) using Composio search tools. Satisficing-first: find the 'good enough' option, not the premium one. Load when the user asks for tool/hardware/gadget recommendations or wants to buy something."
version: 1.0.0
author: Hermes
license: MIT
metadata:
  hermes:
    tags: [productivity, research, shopping, decisions]
---

# Product Research — Satisficing-First Recommendation Framework

## Core Principle

> **"Satisficing" = good enough, not best.** The user wants the minimum viable product that solves their problem. Don't optimize for specs they won't use.

## When to Load

- User asks "what should I buy for X?"
- User mentions a product category (tablets, styluses, laptops, etc.)
- User says "satisfice" or "don't need a lot of compute" or "just need it to work"

## Workflow

### 1. Understand the actual problem (before searching)

Ask yourself: **What is the user trying to DO, not what are they trying to BUY?**

- "Writing ML equations" → needs: responsive stylus, decent screen size, no lag
- NOT: "latest chip, most RAM, best display"

The user's current pain point (e.g., "Fire tablet lags with finger writing") tells you the minimum bar, not the ceiling.

### 2. Search across retailers in parallel

Use Composio tools. Batch independent searches in one call:

```
COMPOSIO_SEARCH_AMAZON (amazon.com or amazon.in)
COMPOSIO_SEARCH_SHOPPING (Google Shopping — covers multiple retailers)
COMPOSIO_SEARCH_WALMART (if relevant)
```

**Search strategy:**
- Query 1: "[product] price" — get the landscape
- Query 2: "[product] [accessory] bundle" — find deals
- Query 3: "cheapest [product category] for [use case]" — find the floor
- Query 4: "[product] vs [alternative]" — validate your recommendation

For India: use `amazon_domain: "amazon.in"` explicitly.

### 3. Build a tiered comparison

Present findings as a TABLE with columns:

| Option | Price | What it is | Notes |
|--------|-------|-----------|-------|
| Cheapest viable | $X | ... | ... |
| **Best value (satisficing pick)** | $X | ... | ... |
| Premium | $X | ... | ... |

**Always highlight the satisficing pick** — don't make the user choose from a wall of options.

### 4. Explain the "why not cheaper" and "why not more expensive"

- Why not cheaper: what you'd lose (e.g., "32GB is too tight for notes")
- Why not more expensive: what you'd gain that you don't need (e.g., "newer chip won't improve handwriting")

### 5. Flag compatibility traps

For hardware with accessories (tablets + styluses, laptops + docks):
- List EXACT compatibility (e.g., "iPad 9th gen = Lightning port = Apple Pencil 1st gen only")
- Note adapter requirements
- Flag "USB-C only" accessories that won't work with Lightning devices

## Pitfalls

- **Researching before jumping to conclusions.** User corrected this explicitly: "spend time researching before jumping to conclusion." Always search FIRST, recommend SECOND.
- **Over-engineering.** When user says "satisfice" or "don't need much," the satisficing option IS the recommendation. Don't present the premium option as "also consider..." — it adds decision fatigue.
- **Forgetting regional pricing.** If the user might be in India, check amazon.in. Prices can be 2-3x different.
- **Missing the adapter/accessory trap.** Tablets with Lightning vs USB-C ports require different styluses. Always check port type before recommending an accessory.
- **Not checking refurbished/renewed.** Amazon Renewed can save 30-50% with minimal risk. Always include it as an option.

## Apple Pencil Compatibility Quick Reference

| iPad Model | Port | Compatible Pencil |
|-----------|------|------------------|
| iPad 6th-9th gen (2018-2021) | Lightning | Apple Pencil 1st gen |
| iPad 10th gen (2022) | USB-C | Apple Pencil USB-C (with adapter for 1st gen) |
| iPad 11th gen (A16, 2025) | USB-C | Apple Pencil USB-C |
| iPad mini 7 (A17 Pro) | USB-C | Apple Pencil Pro |
| iPad Air M2/M3 | USB-C | Apple Pencil Pro or 2nd gen |
| iPad Pro M4 | USB-C | Apple Pencil Pro |

## Anti-Pattern: "Just tell me what to buy"

If the user says this, they still want the tiered comparison — they just want it concise. Give the table, highlight the pick, done. Don't over-explain.
