#!/bin/bash
# Provider health check — pre-flight for data-integration cron jobs
# Exit0 = provider healthy, exit1 = provider unhealthy (caller should retry or abort)
set -euo pipefail

API_KEY=$(grep -oP 'OPENCODE_API_KEY=\K.*' ~/.hermes/.env 2>/dev/null || echo "")

if [ -z "$API_KEY" ]; then
    echo "[health-check] WARNING: OPENCODE_API_KEY not found in ~/.hermes/.env"
    echo "[health-check] Proceeding anyway — agent will handle errors."
    exit0
fi

HTTP_CODE=$(timeout10 curl -s -o /dev/null -w "%{http_code}" \
    -H "Authorization: Bearer $API_KEY" \
    "https://api.opencode.ai/v1/models" 2>/dev/null || echo "000")

case "$HTTP_CODE" in
    200) echo "[health-check] Provider OK (HTTP $HTTP_CODE)"; exit0 ;;
    401) echo "[health-check] API key invalid (HTTP401). Check OPENCODE_API_KEY."; exit1 ;;
    429) echo "[health-check] Rate limited (HTTP429). Provider temporarily unavailable."; exit1 ;;
    000) echo "[health-check] Provider unreachable (timeout). Network or outage."; exit1 ;;
    *)   echo "[health-check] Provider returned HTTP $HTTP_CODE. Proceeding anyway."; exit0 ;;
esac
