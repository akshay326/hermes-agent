# Large Composio Response Handling

When `COMPOSIO_MULTI_EXECUTE_TOOL` returns a response too large for inline processing (100K+ tokens), use the remote workbench to parse it.

## Pattern

### Step 1: Fetch with workbench persistence

```python
# In COMPOSIO_MULTI_EXECUTE_TOOL, set sync_response_to_workbench=true
result = COMPOSIO_MULTI_EXECUTE_TOOL(
    tools=[...],
    sync_response_to_workbench=True,  # saves full response to sandbox
    session_id="..."
)
```

The response will include:
- Inline preview (truncated)
- `remote_file_info.file_path` pointing to the full JSON in `/mnt/files/`

### Step 2: Parse in remote workbench

```python
# In COMPOSIO_REMOTE_WORKBENCH
import json

with open("/mnt/files/mex/trap.json") as f:
    file_data = json.load(f)

# Access i-th result
result_data = file_data['results'][i]['response']['data']

# Use structure_info to understand the schema
# Use data_preview for truncated samples
```

### Step 3: Analyze

Use standard Python (collections, itertools) to categorize, aggregate, and detect patterns in the data.

## When to use this pattern

- Calendar events lists (600+ events = huge JSON)
- Gmail search results with full message bodies
- Any Composio tool returning paginated or bulk data

## Pitfall: structure_info vs data_preview

The inline response shows `structure_info` (schema) and `data_preview` (samples). These are NOT the full data — they're previews. Always read from the remote file for complete analysis.

The `data_structure` in `structure_info` shows direct children of `response.data`, NOT nested under another `data` key.
