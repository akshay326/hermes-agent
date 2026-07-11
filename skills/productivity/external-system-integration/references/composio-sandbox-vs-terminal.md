# Composio Sandbox vs Terminal Environment

## The Two Environments

When working with Composio tools, there are two distinct execution contexts:

1. **Terminal** — the main docker environment where `terminal()` runs
2. **Composio Sandbox** — the remote Jupyter-like environment in `COMPOSIO_REMOTE_WORKBENCH`

They have different capabilities and limitations.

## Environment Variables

**Key difference:** Environment variables set in the terminal (or available via `terminal()`) are NOT automatically available in the Composio sandbox.

Example:
```bash
# In terminal — works fine
echo $OPENROUTER_API_KEY  # Returns: sk-or-...dd44

# In COMPOSIO_REMOTE_WORKBENCH — may be empty
import os
print(os.environ.get("OPENROUTER_API_KEY"))  # May print: None
```

**Workaround:** Use `terminal()` to get env vars, then pass them to your script:
```python
# In COMPOSIO_REMOTE_WORKBENCH
import subprocess
result = subprocess.run(["bash", "-c", "echo $OPENROUTER_API_KEY"], 
                       capture_output=True, text=True)
api_key = result.stdout.strip()
```

Or better: run the entire script via `terminal()` instead of the sandbox.

## Python Availability

The docker terminal often does NOT have Python installed:
```bash
which python3  # May fail
which python   # May fail
```

**Fallback:** Bun is usually available:
```bash
which bun  # /usr/local/bin/bun
```

Bun can run JavaScript/TypeScript with native `fetch()` support, making it ideal for API calls.

## When to Use Which

| Use Case | Recommended Environment |
|----------|------------------------|
| Bulk data processing with Composio tools | `COMPOSIO_REMOTE_WORKBENCH` |
| Calling external APIs (OpenRouter, etc.) | `terminal` (has env vars) |
| Multi-tool orchestration | `COMPOSIO_REMOTE_WORKBENCH` |
| Scripts needing env vars | `terminal` |
| Python scripts (if available) | Either |
| JavaScript/TypeScript scripts | `terminal` (bun) |

## Pattern: Vision AI Analysis

When analyzing images from Google Drive (e.g., handwritten diagrams):

1. Download the file via Composio tools
2. Get the S3 URL from `GOOGLEDRIVE_DOWNLOAD_FILE` response
3. Use `terminal` + `bun` to:
   - Download the image from S3
   - Base64 encode it
   - Call OpenRouter API with the image
4. Parse the response

Example script structure:
```javascript
// /tmp/analyze.mjs
const s3Url = "https://temp...";  // From Composio response
const apiKey = process.env.OPENROUTER_API_KEY;

const imgResponse = await fetch(s3Url);
const buffer = Buffer.from(await imgResponse.arrayBuffer());
const b64 = buffer.toString('base64');

const apiResponse = await fetch("https://openrouter.ai/api/v1/chat/completions", {
  method: "POST",
  headers: {
    "Authorization": `Bearer ${apiKey}`,
    "Content-Type": "application/json"
  },
  body: JSON.stringify({
    model: "google/gemini-3.1-flash-image",
    messages: [{
      role: "user",
      content: [
        { type: "text", text: "Analyze this image..." },
        { type: "image_url", image_url: { url: `data:image/png;base64,${b64}` } }
      ]
    }]
  })
});

const result = await apiResponse.json();
console.log(result.choices[0].message.content);
```
