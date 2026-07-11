# Composio Search Tools — Product Research

## Tool Slugs for Shopping Research

| Tool | Use Case | Notes |
|------|----------|-------|
| `COMPOSIO_SEARCH_AMAZON` | Amazon product search | Supports `amazon_domain` for India (amazon.in), UK (amazon.co.uk), etc. |
| `COMPOSIO_SEARCH_SHOPPING` | Google Shopping (multi-retailer) | Best for price comparison across retailers |
| `COMPOSIO_SEARCH_WALMART` | Walmart search | US only |

## Parallel Search Pattern

Always batch 3-4 independent searches in one `COMPOSIO_MULTI_EXECUTE_TOOL` call:

```json
{
  "tools": [
    {"tool_slug": "COMPOSIO_SEARCH_AMAZON", "arguments": {"query": "iPad 9th generation 64GB", "amazon_domain": "amazon.com"}},
    {"tool_slug": "COMPOSIO_SEARCH_SHOPPING", "arguments": {"query": "cheapest iPad with Apple Pencil support"}},
    {"tool_slug": "COMPOSIO_SEARCH_AMAZON", "arguments": {"query": "Apple Pencil 1st generation", "amazon_domain": "amazon.in"}}
  ]
}
```

## Response Parsing

Results are saved to `/mnt/files/mex/bean.json` (or similar). Inline `data_preview` has samples; use `structure_info` to understand schema. For full data, parse the JSON file with Python.

Key fields in Amazon results:
- `extracted_price` (number)
- `old_price` (string, for showing discounts)
- `bought_last_month` (string, e.g., "500+ bought")
- `rating` (number)
- `reviews` (number)
- `badges` (array, e.g., ["Overall Pick"], ["Prime Day Deal"])

Key fields in Google Shopping results:
- `extracted_price` (number)
- `price` (string with $)
- `source` (retailer name)
- `delivery` (e.g., "Free delivery")
- `rating` (number)
- `reviews` (number)
