---
name: diagram-ecosystem
description: "AI-powered diagramming tools ecosystem — tldraw, ArchitectureDiagram.ai, draw.io, multimodal critique workflows. Use when evaluating diagramming tools or setting up AI-assisted diagram review."
version: 1.1.0
author: Hermes Agent
license: MIT
dependencies: []
platforms: [linux, macos, windows, tablet]
metadata:
  hermes:
    tags: [diagrams, excalidraw, tldraw, AI, multimodal, architecture, visualization]
    related_skills: [excalidraw, claude-design]
---

# Diagram Ecosystem Skill

Tools, workflows, and patterns for diagramming with AI assistance — from browser-based whiteboards to multimodal critique loops.

## When to use

- Evaluating diagramming tools for a specific use case or hardware constraint
- Setting up workflows where an AI reads/critiques hand-drawn diagrams
- Choosing between Excalidraw, tldraw, draw.io, and AI-native diagram tools
- User wants to "draw something and have an agent understand it"

## Tool Landscape (rescanned 2026-07)

### Tier 1: Ready-to-use (browser, no setup)

| Tool | URL | Touch | AI Built-in | Export Formats | Notes |
|------|-----|-------|-------------|----------------|-------|
| **tldraw** | tldraw.com | ✅ | ✅ Agent Starter Kit | PNG, SVG, JSON | Open-source. AI agent reads/manipulates canvas. Agent Starter Kit needs npm deploy for full AI — tldraw.com itself is whiteboard-only. |
| **ArchitectureDiagram.ai** | architecturediagram.ai | ✅ | ✅ Expert Chat | Mermaid, draw.io, Excalidraw, AI images | 2 free credits. Describe system in English → get diagram. Iterative refinement via chat. |
| **Excalidraw** | excalidraw.com | ✅ | ❌ | JSON, PNG, SVG | Touch-friendly, no account. Hand-drawn style easy for multimodal LLMs to read. Best for manual sketching → AI critique via screenshot. |
| **OnlineWhiteboard.org** | onlinewhiteboard.org | ✅ | ❌ | PNG | Minimal, no account, infinite canvas. Good for quick sketches. |

### Tier 2: Developer tools (need setup)

| Tool | What it does | Setup required |
|------|-------------|---------------|
| **excalidraw-architect-mcp** | MCP server: text → auto-laid-out Excalidraw diagrams | pip install, works with Cursor/Claude Code/Windsurf |
| **DiagramAgent** | Three-panel UI: chat + D2 code + live preview | Next.js app, Azure AI or OpenAI key |
| **DeepDiagram** | LangGraph multi-agent → structured diagrams | Python, LLM API key |

### Tier 3: Research/academic

| Tool | Reference |
|------|-----------|
| **Feynman** | arxiv.org/pdf/2603.12597v1 — knowledge-infused diagramming agent |
| **SketchAgent** | arxiv.org/html/2411.17673 — sketches → structured diagrams via multimodal LLM |

### Notion integration

- **Flowblock** (Chrome extension): Notion AI Mermaid → editable Excalidraw/draw.io
- **draw.io in Notion**: embed draw.io diagrams as native blocks
- **NoteDex**: handwritten notes → Notion pages

## Multimodal Critique Workflow

The core use case: "I drew a diagram of how I understand X. Does an AI agree with my mental model?"

**Fastest path (2 minutes, no new tools):**
1. Draw in Excalidraw (or any tool)
2. Screenshot the diagram
3. Upload to Claude (claude.ai) or GPT-4o
4. Prompt: *"I'm studying [topic]. Review this diagram — what do I understand correctly, and where is my thinking wrong or incomplete?"*
5. AI reads the hand-drawn diagram and critiques the mental model

**Interactive path (tldraw Agent Starter Kit):**
1. Deploy tldraw with Agent Starter Kit (`npm create tldraw@latest -- --template agent`)
2. Draw on canvas, chat with AI agent about the diagram
3. Agent can read shapes, suggest modifications, critique architecture

**Text-to-diagram path (ArchitectureDiagram.ai):**
1. Describe architecture in English
2. Get professional diagram in seconds
3. Edit via AI chat, export to Excalidraw/draw.io/Mermaid

## References

> **Full workflow reference**: See `references/drawio-google-drive-workflow.md` for the complete setup, daily protocol, file access chain, and Composio tool details.

> **Draw.io file parsing reference**: See `references/drawio-parsing-techniques.md` for detailed decoding chains for .drawio XML, compressed diagrams, and PNG-embedded XML.

> **Composio query patterns**: See `references/composio-google-drive-queries.md` for Google Drive file discovery patterns: date filtering, MIME type filtering, pagination, and cron job monitoring.

### draw.io + Google Drive (recommended for tablets)

draw.io (diagrams.net) has **automatic saving** to Google Drive — no manual export needed.

**Setup:**
1. Open `app.diagrams.net` in browser (works in Silk on Fire tablet)
2. Click "Google Drive" when prompted for storage location
3. Complete one-time OAuth authorization
4. All edits auto-save to Google Drive as `.drawio` files

**How it works:**
- Saving is automatic — every change persists to Google Drive
- Uses Google Drive's revision history (File > Revision History in draw.io)
- Real-time collaboration supported
- Files stored as `.xml` or `.drawio` format

**For AI analysis pipeline:**
- draw.io saves `.drawio` (XML), NOT images — can't directly use vision analysis
- To analyze: download `.drawio` via Google Drive API → convert to PNG → vision analyze
- OR: use draw.io's File > Export as PNG (manual, but gets image format)
- Alternative: Excalidraw exports PNG natively, but lacks auto-save to cloud

**Composio Google Drive access:**
- Google Drive toolkit needs separate OAuth (not same as Google Docs)
- Use `COMPOSIO_MANAGE_CONNECTIONS` with toolkit `googledrive` to initiate
- Once connected: `GOOGLEDRIVE_FIND_FILE` to find `.drawio` files, `GOOGLEDRIVE_DOWNLOAD_FILE` to retrieve

### Other auto-save options

| Tool | Cloud Save | Format | Notes |
|------|-----------|--------|-------|
| draw.io + Google Drive | ✅ Auto | .drawio (XML) | Best for tablet use, needs conversion for vision |
| Excalidraw | ❌ Manual export | .excalidraw, PNG | Best for hand-drawn style, no cloud sync |
| tldraw | ⚠️ Needs self-host | JSON, PNG | Agent Starter Kit for AI integration |
| Google Docs drawing | ✅ Auto | Native Google | Limited drawing features |

## Hardware Constraints

When recommending tools, check:
- **Fire tablet / mobile**: Needs browser-based, touch-friendly. No app installs. draw.io works well here.
- **Desktop**: Full options available.
- **Offline**: excalidraw-architect-mcp works offline. tldraw.com needs internet.
- **No account required**: Excalidraw, OnlineWhiteboard.org, tldraw.com (basic)

## Vision Configuration for AI Analysis

`vision_analyze` requires an **auxiliary vision provider** configured — it does NOT use the main model's vision capabilities. If MiMo V2.5 (or any text-only model) is the main model, vision_analyze silently fails with "Image loaded into your context" but returns no analysis.

**Setup (required before diagram feedback works):**
```bash
hermes config set auxiliary.vision.provider openrouter
hermes config set auxiliary.vision.model anthropic/claude-sonnet-4
# OR
hermes config set auxiliary.vision.provider google
hermes config set auxiliary.vision.model gemini-2.0-flash
```

### Model Vision Capabilities (OpenCode Go, tested 2026-07-03)

| Model | Vision Works | Notes |
|-------|-------------|-------|
| Kimi K2.6 | ✅ | Works through OpenCode Go |
| Qwen 3.6 Plus | ✅ | Works through OpenCode Go |
| DeepSeek V4 | ❌ | No vision exposed |
| MiMo V2.5 Pro | ❌ | Model is multimodal but OpenCode Go doesn't expose image modality |
| MiMo V2.5 | ⚠️ | Omnimodal but OpenCode Go registration issue |

### Workaround: Direct OpenRouter API (PROVEN WORKING)

When `vision_analyze` fails (MiMo V2.5 through OpenCode Go), call OpenRouter API directly with a vision-capable model. **Tested and confirmed working:**

```python
import requests, base64, json

# Read image
with open("image.png", "rb") as f:
    base64_image = base64.b64encode(f.read()).decode('utf-8')

# Call Gemini 3.1 Flash Image via OpenRouter
headers = {"Authorization": f"Bearer {OPENROUTER_API_KEY}", "Content-Type": "application/json"}
payload = {
    "model": "google/gemini-3.1-flash-image",  # NOT gemini-2.0-flash (wrong name)
    "messages": [{"role": "user", "content": [
        {"type": "text", "text": "Describe this diagram..."},
        {"type": "image_url", "image_url": {"url": f"data:image/png;base64,{base64_image}"}}
    ]}],
    "max_tokens": 2000
}
response = requests.post("https://openrouter.ai/api/v1/chat/completions", headers=headers, json=payload)
content = response.json()["choices"][0]["message"]["content"]
```

**Key findings:**
- `google/gemini-2.0-flash-001` → 404 (wrong model name)
- `google/gemini-3.1-flash-image` → ✅ Works (explicitly image-capable)
- `google/gemini-3.1-flash-lite-image` → Also available
- The model name must include `-image` suffix for vision support

**Fallback: Programmatic image analysis (no vision needed)** — When vision_analyze, OpenRouter API, and browser screenshots all fail, use PIL/Pillow in the COMPOSIO_REMOTE_WORKBENCH to analyze the image structurally:

```python
from PIL import Image
import collections

img = Image.open("/path/to/image.png")
pixels = img.load()
width, height = img.size

# 1. Find visible content bounding box (skip transparent pixels)
visible = [(x,y,pixels[x,y]) for y in range(height) for x in range(width) 
           if pixels[x,y][3] > 128]  # RGBA, alpha > 128

# 2. Find connected components via flood fill
# 3. Classify regions by aspect ratio:
#    - High aspect (>5): lines, arrows, text
#    - Medium (1-3): boxes, shapes
#    - Low (<0.5): vertical bars, columns

# 4. Create ASCII visualization for human/LLM review
# 5. Feed structural description to invoke_llm()
```

**invoke_llm with structural descriptions**: Even without vision, passing a structural summary (bounding boxes, region counts, aspect ratios, pixel density) to `invoke_llm()` can produce useful analysis of what the diagram likely represents.

### draw.io Export Format gotcha

Google Drive download returns `.drawio` (XML) even when you request PNG export via `GOOGLEDRIVE_DOWNLOAD_FILE`. The `mime_type` parameter is ignored for non-Google Workspace files. To get actual PNG:
- User must manually export as PNG from draw.io UI (File → Export as → PNG)
- OR parse the .drawio XML directly (shapes, text, connections are all in the XML)

**IMPORTANT**: When user exports PNG from draw.io UI, Google Drive metadata shows `.drawio` extension, but the file content IS a valid PNG. Verify by checking header bytes: `\x89PNG` (hex: `89504e47`).

### Draw.io PNG with Embedded XML (parsed 2026-07-03)

Sometimes draw.io exports a file named `*.drawio.png` — a **real PNG** that also embeds the drawio XML in a `tEXt` metadata chunk. This is different from a plain `.drawio` XML file.

**How to detect**: Check if the file starts with PNG header `89 50 4E 47`. If yes, parse the PNG chunks:

```python
import struct, base64, zlib
from urllib.parse import unquote

def extract_drawio_from_png(png_bytes):
    """Extract embedded drawio XML from a PNG file's tEXt chunk."""
    pos = 8  # skip PNG signature
    while pos < len(png_bytes) - 8:
        length = struct.unpack('>I', png_bytes[pos:pos+4])[0]
        chunk_type = png_bytes[pos+4:pos+8]
        chunk_data = png_bytes[pos+8:pos+8+length]
        
        if chunk_type == b'tEXt':
            key_end = chunk_data.index(b'\x00')
            key = chunk_data[:key_end].decode('utf-8')
            value = chunk_data[key_end+1:]
            if key == 'mxfile':
                # Value is URL-encoded, base64-encoded, deflate-compressed XML
                url_decoded = unquote(value.decode('utf-8', errors='replace'))
                raw = base64.b64decode(url_decoded)
                decompressed = zlib.decompress(raw, -zlib.MAX_WBITS)
                xml_str = unquote(decompressed.decode('utf-8', errors='replace'))
                return xml_str  # This is the mxGraphModel XML
        
        pos = pos + 12 + length
        if chunk_type == b'IEND':
            break
    return None
```

**Decoding chain**: `PNG tEXt → URL decode → base64 decode → deflate decompress → URL decode → mxGraphModel XML`

**Gotcha**: The decompressed data is URL-encoded (`%3CmxGraphModel...`), not raw XML. Always URL-decode after decompression.

### Folder creation before monitoring

Always check if folder exists before creating:
```python
# Check
result = GOOGLEDRIVE_FIND_FOLDER(name_exact="ml-diagrams")
files = result["data"]["files"]
# Create only if empty
if not files:
    result = GOOGLEDRIVE_CREATE_FOLDER(name="ml-diagrams")
    folder_id = result["data"]["id"]
```

## Pitfalls

### OpenRouter API base64 encoding breaks under shell interpolation

When calling OpenRouter API from bun/JavaScript with base64-encoded images, **never pass base64 through shell variables**. Shell variable interpolation (`$B64`) introduces newlines every ~76 characters, corrupting the base64 string. The API returns `"Base64 decoding failed"` or `"Invalid value at inline_data.data"`.

**Broken:**
```bash
B64=$(base64 image.png)
bun -e "const b64 = \`$B64\`; ..."  # NEWLINES INJECTED
```

**Fixed — read file directly in JavaScript:**
```javascript
const fs = require('fs');
const b64 = fs.readFileSync('/path/to/image.png').toString('base64');
// b64 is clean, no newlines
```

**Or if you must use shell:** pipe through `tr -d '\n'`:
```bash
B64=$(base64 image.png | tr -d '\n')
```

### Draw.io XML decompression in PNG tEXt chunks

The decoding chain (`PNG tEXt → URL decode → base64 decode → deflate decompress → URL decode → XML`) **works with `inflateRawSync`** (Node.js/bun). Earlier reports of failure were caused by using `inflateSync` (expects zlib header) instead of `inflateRawSync` (raw deflate).

**Proven working (2026-07-05):**
```javascript
const { inflateRawSync } = require('zlib');
// After URL-decoding the tEXt value and base64-decoding:
const buffer = Buffer.from(base64Data, 'base64');
const decompressed = inflateRawSync(buffer).toString('utf-8');
// decompressed is URL-encoded — must URL-decode again to get XML
```

**Custom stencil shapes** within the decompressed XML can be further decoded:
```
stencil base64 → inflateRawSync → URL decode → SVG path XML with <move>/<line> coordinates
```
Analyze coordinate arrays to classify shapes without vision (see `references/drawio-parsing-techniques.md`).

**Fallback (only if decompression truly fails — rare):** Analyze the PNG at the pixel level (see "Transparent PNGs" section).

### Transparent PNGs appear black in vision models and dark viewers

Excalidraw and many whiteboard tools export PNGs with **transparent backgrounds**. Vision models (including Gemini) interpret transparent pixels as black — the entire image appears as a solid black rectangle. This is NOT just a dark-mode display issue; it affects API-based vision analysis too.

**Detection**: Vision API returns "image is entirely black" or "no visible content" for a diagram you know has content.

**Fix (mandatory before any vision API call):** Composite over white background:
```bash
# Bun + pngjs (works on arm64 — sharp does NOT work in this env)
bun add pngjs
```
```js
const { PNG } = require('pngjs');
const fs = require('fs');
const png = PNG.sync.read(fs.readFileSync(inputPath));
const out = new PNG({ width: png.width, height: png.height });
for (let y = 0; y < png.height; y++) {
  for (let x = 0; x < png.width; x++) {
    const idx = (png.width * y + x) << 2;
    const a = png.data[idx + 3] / 255;
    out.data[idx]     = Math.round(png.data[idx] * a + 255 * (1 - a));
    out.data[idx + 1] = Math.round(png.data[idx + 1] * a + 255 * (1 - a));
    out.data[idx + 2] = Math.round(png.data[idx + 2] * a + 255 * (1 - a));
    out.data[idx + 3] = 255;
  }
}
fs.writeFileSync(outputPath, PNG.sync.write(out));
```

**Prevention**: When exporting from Excalidraw, set `appState.viewBackgroundColor: "#ffffff"` so the export includes an opaque background.

**Environment note**: `sharp` npm package fails on this docker arm64 env (ERR_DLOPEN_FAILED). Use `pngjs` instead. `python3` / `pip` are not available in the terminal. `bun` is the only runtime.

**Alternative: Pixel-level analysis without pngjs** — When pngjs is unavailable or you need to analyze content before compositing, parse the PNG manually:

```javascript
const fs = require('fs');
const { inflateSync } = require('zlib');
const pngBuf = fs.readFileSync(inputPath);

// Parse PNG chunks to get IDAT data
let offset = 8, width = 0, height = 0;
const idatChunks = [];
while (offset < pngBuf.length) {
  const len = pngBuf.readUInt32BE(offset);
  const type = pngBuf.toString('ascii', offset + 4, offset + 8);
  if (type === 'IHDR') { width = pngBuf.readUInt32BE(offset + 8); height = pngBuf.readUInt32BE(offset + 12); }
  if (type === 'IDAT') idatChunks.push(pngBuf.slice(offset + 8, offset + 8 + len));
  if (type === 'IEND') break;
  offset += 12 + len;
}

const pixels = inflateSync(Buffer.concat(idatChunks));
// Color type 6 = RGBA (4 bytes/pixel + 1 filter byte/row)
const rowBytes = 1 + width * 4;

// Count non-transparent pixels to verify content exists
let contentPixels = 0;
for (let y = 0; y < height; y++) {
  for (let x = 0; x < width; x++) {
    const a = pixels[y * rowBytes + 1 + x * 4 + 3];
    if (a > 0) contentPixels++;
  }
}
console.log(`Content pixels: ${contentPixels} / ${width * height} (${(contentPixels/(width*height)*100).toFixed(1)}%)`);
```

## Research Pattern

When evaluating tools for a user's specific constraints:
1. Search across multiple angles (web search, fetch details, news)
2. Fetch full content from top candidates
3. Present as tiered comparison (ready-to-use → developer → research)
4. Match to user's hardware/workflow constraints
5. Recommend smallest experiment to validate the hypothesis
