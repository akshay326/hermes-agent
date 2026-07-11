# Draw.io + Google Drive → AI Feedback Workflow

## Setup (one-time)

1. **Google Drive OAuth**: User connects Google Drive via Composio
   - `COMPOSIO_MANAGE_CONNECTIONS` with toolkit `googledrive`
   - User clicks OAuth link, authorizes
   - Connection becomes ACTIVE

2. **Create dedicated folder**: `ml-diagrams` in Google Drive
   - `GOOGLEDRIVE_CREATE_FOLDER` with name `ml-diagrams`
   - Store the folder ID for monitoring

3. **Configure vision**: Set auxiliary vision provider
   ```bash
   hermes config set auxiliary.vision.provider openrouter
   hermes config set auxiliary.vision.model anthropic/claude-sonnet-4
   ```

## Daily Protocol

1. **User**: Opens `app.diagrams.net` in Silk browser (Fire tablet)
2. **User**: Connects to Google Drive (one-time OAuth in draw.io)
3. **User**: Draws equations/diagrams
4. **draw.io**: Auto-saves to Google Drive as `.drawio` files
5. **User**: Exports as PNG (File → Export as → PNG) → saves to `ml-diagrams` folder
6. **AI**: Cron job monitors `ml-diagrams` folder every 5 minutes
7. **AI**: Downloads new PNGs via `GOOGLEDRIVE_DOWNLOAD_FILE`
8. **AI**: Analyzes with `vision_analyze` (requires auxiliary vision provider)
9. **AI**: Delivers feedback to Discord

## File Access Chain

```
Google Drive folder ID: 1wr0vOYECrLWPhFpOZI5VqqkoZRKBoYRn
  ↓ GOOGLEDRIVE_FIND_FILE (q: "'FOLDER_ID' in parents and mimeType contains 'image/'")
  ↓ GOOGLEDRIVE_DOWNLOAD_FILE (fileId, mimeType: "image/png")
  ↓ vision_analyze (uploaded image URL or screenshot URL)
  ↓ feedback to Discord
```

## Cron Job Setup (Diagram Feedback)

Create a cron job that monitors the `ml-diagrams` folder:

```python
cronjob(
    action="create",
    name="diagram-feedback",
    schedule="every 5m",
    deliver="discord",
    prompt="""You are a machine learning tutor. Your task is to:

1. Check Google Drive folder "ml-diagrams" (ID: 1wr0vOYECrLWPhFpOZI5VqqkoZRKBoYRn) for new PNG files created in the last 5 minutes using the Google Drive tools
2. For each new PNG, download it and analyze it using the OpenRouter API with Gemini 3.1 Flash Image model (model: google/gemini-3.1-flash-image)
3. Based on what you see in the diagram, ask 2-3 probing questions to test the user's understanding of the ML concepts shown
4. Deliver your questions/feedback to Discord

Use the OpenRouter API key from environment: OPENROUTER_API_KEY
Model: google/gemini-3.1-flash-image
Endpoint: https://openrouter.ai/api/v1/chat/completions"""
)
```

**Alternative: Direct API call in cron job** (if `vision_analyze` still fails):
```python
# In the cron job prompt, include this Python snippet:
import requests, base64, json, os
api_key = os.environ.get("OPENROUTER_API_KEY")
# ... (see "Workaround: Direct OpenRouter API" in main SKILL.md)
```

## File Management: Same File vs New File

- **Refining same concept** → Edit the existing draw.io file, re-export PNG (overwrites previous)
- **New learning topic** → Create new file in draw.io, export as new PNG to `ml-diagrams` folder
- Each PNG is a snapshot of your thinking at that moment
- Cron job picks up ANY new PNG in the folder — no configuration needed per file

## Gotchas

- `GOOGLEDRIVE_DOWNLOAD_FILE` ignores mime_type for non-Google Workspace files — returns .drawio even when PNG requested
- User MUST manually export as PNG from draw.io UI
- `vision_analyze` requires auxiliary vision provider configured
- MiMo V2.5 through OpenCode Go doesn't expose vision — use Kimi K2.6 or Qwen 3.6 Plus
- **PROVEN WORKAROUND**: Call OpenRouter API directly with `google/gemini-3.1-flash-image` (NOT `gemini-2.0-flash` which is wrong model name)
- When user exports PNG from draw.io, file metadata shows `.drawio` but the file IS actually a PNG (check header bytes: `\x89PNG`)
- Browser tool can capture screenshots even when vision fails: `BROWSER_TOOL_CREATE_TASK` → `BROWSER_TOOL_WATCH_TASK`

## Composio Tools Used

| Tool | Purpose |
|------|---------|
| `GOOGLEDRIVE_FIND_FILE` | Search for PNGs in ml-diagrams folder |
| `GOOGLEDRIVE_DOWNLOAD_FILE` | Download PNG for analysis |
| `GOOGLEDRIVE_CREATE_FOLDER` | Create ml-diagrams folder |
| `GOOGLEDRIVE_FIND_FOLDER` | Check if folder exists before creating |
| `COMPOSIO_MANAGE_CONNECTIONS` | Initiate Google Drive OAuth |
| `COMPOSIO_WAIT_FOR_CONNECTIONS` | Poll until connection active |
| `BROWSER_TOOL_CREATE_TASK` | Fallback: capture screenshot of image |
| `BROWSER_TOOL_WATCH_TASK` | Get screenshot URL from browser |

## Folder Creation Workflow

```python
# 1. Check if folder exists
result = COMPOSIO_MULTI_EXECUTE_TOOL(tools=[{
    "tool_slug": "GOOGLEDRIVE_FIND_FOLDER",
    "arguments": {"name_exact": "ml-diagrams"}
}])
files = result["data"]["results"][0]["response"]["data"]["files"]

# 2. Create if not exists
if not files:
    result = COMPOSIO_MULTI_EXECUTE_TOOL(tools=[{
        "tool_slug": "GOOGLEDRIVE_CREATE_FOLDER",
        "arguments": {"name": "ml-diagrams"}
    }])
    folder_id = result["data"]["results"][0]["response"]["data"]["id"]
else:
    folder_id = files[0]["id"]

# 3. Use folder_id for monitoring
# Folder ID: 1wr0vOYECrLWPhFpOZI5VqqkoZRKBoYRn
```

## File Download Gotcha

When downloading PNGs exported from draw.io, the Google Drive API returns the file with `.drawio` extension in metadata and MIME type `application/vnd.jgraph.mxfile`, but the actual content IS a valid PNG. Verify by checking file header bytes: `\x89PNG` (hex: `89504e47`).

**Key detail**: The Google Drive metadata MIME type is `application/vnd.jgraph.mxfile` even when the file is a valid PNG. The `mime_type` parameter on `GOOGLEDRIVE_DOWNLOAD_FILE` is silently ignored for non-Google Workspace files.

### Extracting drawio XML from PNG (no vision needed)

drawio-exported PNGs embed the source diagram XML in a PNG `tEXt` chunk with key `mxfile`. This allows extracting diagram structure programmatically without vision analysis:

```javascript
// Bun: extract drawio XML from PNG's tEXt chunk
const buf = require('fs').readFileSync('diagram.png');
let offset = 8; // skip PNG signature (89 50 4e 47 0d 0a 1a 0a)
while (offset < buf.length) {
  const chunkLen = buf.readUInt32BE(offset);
  const chunkType = buf.slice(offset + 4, offset + 8).toString('ascii');
  const chunkData = buf.slice(offset + 8, offset + 8 + chunkLen);
  if (chunkType === 'tEXt') {
    const nullIdx = chunkData.indexOf(0);
    const key = chunkData.slice(0, nullIdx).toString('ascii');
    if (key === 'mxfile') {
      const val = chunkData.slice(nullIdx + 1).toString('latin1');
      const xml = decodeURIComponent(val); // URL-encoded drawio XML
      console.log(xml); // Full <mxfile>...</mxfile> XML
      break;
    }
  }
  offset += 12 + chunkLen; // 4 len + 4 type + 4 crc + data
}
```

The extracted XML contains shape positions, text labels, and connections — enough to reconstruct the diagram structure for text-based analysis when vision isn't available.

```python
# Verify downloaded file is actually PNG
with open("downloaded_file", "rb") as f:
    header = f.read(4)
    if header == b'\x89PNG':
        print("✅ Valid PNG file")
    else:
        print("❌ Not a PNG file")
```
