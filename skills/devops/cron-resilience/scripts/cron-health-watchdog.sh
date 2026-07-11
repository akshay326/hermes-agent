#!/bin/bash
# Cron Health Watchdog — re-runs failed data-integration jobs
# Runs every30 min via cron (no_agent=true)
# Only re-runs jobs listed in DATA_JOBS
set -o pipefail

OUTPUT_DIR="$HOME/.hermes/cron/output"
DATA_JOBS="a6576d6d6a19 d2688bfa66ea"  # kpi-sheet, research-ingestion — UPDATE THESE for your system
RETRY_LOG="$OUTPUT_DIR/.watchdog-retries.json"

# Don't run between midnight and7 AM PDT (sleep hours)
PDT_HOUR=$(TZ=America/Los_Angeles date +%-H)
if [ "$PDT_HOUR" -lt7 ] 2>/dev/null; then
    exit0
fi

# Initialize retry log
if [ ! -f "$RETRY_LOG" ]; then
    echo '{}' > "$RETRY_LOG"
fi

for JOB_ID in $DATA_JOBS; do
    JOB_DIR="$OUTPUT_DIR/$JOB_ID"
    if [ ! -d "$JOB_DIR" ]; then
        continue
    fi

    # Find the most recent output file
    LATEST=$(ls -t "$JOB_DIR"/*.md 2>/dev/null | head -1)
    if [ -z "$LATEST" ]; then
        continue
    fi

    # Check if it failed
    if ! head -5 "$LATEST" | grep -q "FAILED"; then
        continue
    fi

    # Check when the failure happened (file mtime)
    FAIL_TIME=$(stat -c %Y "$LATEST" 2>/dev/null) || continue
    NOW=$(date +%s)
    AGE_MIN=$(( (NOW - FAIL_TIME) /60 ))

    # Only retry if failure was 20-90 minutes ago (not too fresh, not too old)
    if [ "$AGE_MIN" -lt20 ] || [ "$AGE_MIN" -gt90 ] 2>/dev/null; then
        continue
    fi

    # Check retry count for today
    TODAY=$(date +%Y-%m-%d)
    RETRIES=$(python3 -c "
import json, os
path = '$RETRY_LOG'
try:
    d = json.load(open(path)) if os.path.exists(path) else {}
except:
    d = {}
print(d.get('$JOB_ID', {}).get('$TODAY', 0))
" 2>/dev/null || echo "0")
    RETRIES=${RETRIES:-0}

    if [ "$RETRIES" -ge2 ] 2>/dev/null; then
        echo "[watchdog] $JOB_ID already retried2x today ($TODAY). Skipping."
        continue
    fi

    echo "[watchdog] Re-running $JOB_ID (failure was ${AGE_MIN}m ago, retry #${RETRIES} +1)"
    hermes cron run "$JOB_ID" --accept-hooks 2>&1 || true

    # Update retry log
    python3 -c "
import json, os
path = '$RETRY_LOG'
try:
    d = json.load(open(path)) if os.path.exists(path) else {}
except:
    d = {}
if '$JOB_ID' not in d:
    d['$JOB_ID'] = {}
d['$JOB_ID']['$TODAY'] = d['$JOB_ID'].get('$TODAY', 0) + 1
json.dump(d, open(path, 'w'), indent=2)
"
done
