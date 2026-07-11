# Draw.io File Parsing Techniques

## File Types Encountered

### 1. Pure `.drawio` XML
Standard draw.io format. Contains `<mxfile>` root with `<diagram>` elements.

```xml
<mxfile host="app.diagrams.net" pages="2">
  <diagram name="Page-1" id="...">
    <mxGraphModel>...</mxGraphModel>
  </diagram>
</mxfile>
```

**Parse directly** with `xml.etree.ElementTree`.

### 2. `.drawio` with Compressed Diagrams
The `<diagram>` element's text content is **not raw XML** — it's compressed:

```
Decoding chain:
diagram.text → base64 decode → deflate decompress (-MAX_WBITS) → URL decode → XML
```

```python
import base64, zlib
from urllib.parse import unquote

raw = base64.b64decode(diagram.text.strip())
decompressed = zlib.decompress(raw, -zlib.MAX_WBITS)
xml_str = unquote(decompressed.decode('utf-8'))
# Now xml_str is valid mxGraphModel XML
```

**Gotcha**: After decompression, the data is URL-encoded (`%3CmxGraphModel...`). Must URL-decode.

### 3. `.drawio.png` (PNG with Embedded XML)
A real PNG file that embeds drawio XML in a `tEXt` metadata chunk.

```python
# PNG chunk structure: [4-byte length][4-byte type][data][4-byte CRC]
# Look for tEXt chunk with key="mxfile"
```

**Decoding chain**: 
```
PNG tEXt → split on \x00 → URL decode value → base64 decode → deflate decompress → URL decode → XML
```

**✅ Confirmed working (2026-07-05):** The deflate decompression step **does work** using `zlib.inflateRawSync()` (Node.js/bun). The earlier caveat was wrong — the issue was that `inflateSync()` (with default headers) fails, but `inflateRawSync()` (raw deflate, no zlib header) succeeds.

**Correct decompression chain for `.drawio.png`:**
```
PNG tEXt → split on \x00 → URL decode value → inflateRawSync (Node.js) or zlib.decompress(raw, -zlib.MAX_WBITS) (Python)
```

**Bun/Node.js proven working:**
```javascript
const { inflateRawSync } = require('zlib');
const buffer = Buffer.from(base64Data, 'base64');
const decompressed = inflateRawSync(buffer).toString('utf-8');
// decompressed is URL-encoded — must URL-decode again
```

**⚠️ After decompression, the result is URL-encoded** (`%3CmxGraphModel...`). Must URL-decode to get valid XML. This is a double-encoding: the diagram content is deflate-compressed, then base64-encoded, then URL-encoded within the PNG tEXt chunk.

### Custom Stencil Decoding

The decompressed mxGraphModel XML may contain custom stencil shapes defined as base64-encoded, deflate-compressed SVG path data:

```
stencil base64 → inflateRawSync → URL decode → SVG path XML
```

Each stencil contains `<move>` and `<line>` elements with x,y coordinates (0-100 scale) that define the shape's path. These can be analyzed programmatically to understand diagram content without vision:
- Extract coordinate arrays from all stencils
- Classify shapes by aspect ratio, monotonicity, and curvature
- Map element positions to understand layout structure

**Fallback when decompression truly fails (rare):**
1. Parse PNG IDAT chunks to get raw RGBA pixel data
2. Count non-transparent pixels (alpha > 0) — if < 5% of total, the diagram is mostly empty/transparent
3. Composite over white background: for each pixel, blend `color * alpha + 255 * (1 - alpha)`
4. Save as new PNG and send to vision model

This approach works because draw.io renders diagrams as semi-transparent black on transparent background.

### 4. Plain PNG (Exported from draw.io)
No embedded XML — just pixel data. Requires vision analysis or programmatic pixel analysis.

## Vision Analysis Workarounds

When `vision_analyze` and OpenRouter API both fail:

1. **PIL pixel analysis**: Find bounding boxes, connected components, aspect ratios
2. **ASCII visualization**: Create scaled-down character representation
3. **invoke_llm with structural summary**: Pass region descriptions to LLM

## Google Drive Gotchas

- `GOOGLEDRIVE_DOWNLOAD_FILE` ignores `mime_type` for non-Workspace files
- Files with `.png` extension may actually be drawio format
- Always check file header bytes to determine true format
- `GOOGLEDRIVE_FIND_FILE` with `folder_id` parameter works for personal Drive
- If `GOOGLEDRIVE_FIND_FILE` returns empty for a valid folder, try `GOOGLEDRIVE_LIST_CHILDREN_V2` as fallback (may be shared drive or permission issue)
