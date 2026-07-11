---
name: ml-equation-quizzer
description: "Role reversal workflow: student writes ML equations on iPad, teacher (Hermes) reads via Google Drive and quizzes on concepts."
version: 2.0.0
author: Akshay
license: MIT
metadata:
  hermes:
    tags: [ml-learning, ipad, handwriting, quizzing]
---

# ML Equation Quizzer — Role Reversal Workflow

Student writes ML equations/derivations on iPad → Notability auto-backs up to Google Drive → Hermes reads via Drive API → quizzes on concepts.

## Setup
- **iPad app:** Notability (auto-backup to Google Drive enabled, format = PDF)
- **Google Drive folder:** "Notability" (ID: `1WCXZxDJp80qw_GDUF96uBV7yjZqO1QSI`)
- **Archive folder:** "ML-Notes" (ID: `1f_W5daQ6yaeZsZdoStqMYjekVniB7PvK`)
- **Connection:** Google Drive via Composio (account: static.akshay@gmail.com)
- **Student progress:** See `references/student-progress.md` for current learning state, completed topics, and next steps

## Working Pipeline (Verified)
```
iPad → Notability (PDF auto-backup) → Google Drive
→ GOOGLEDRIVE_DOWNLOAD_FILE (returns s3url)
→ Download s3url via bun/fetch in terminal
→ pdftoppm in remote workbench: PDF → PNG at 300 DPI
→ upload_local_file to get S3 URL
→ OpenRouter google/gemini-2.5-flash for vision analysis
```

### CRITICAL: Local Docker has NO Python/curl/pip
The local Docker environment (`/workspace`) has only `bun`. All PDF-to-image conversion MUST happen on the Composio remote workbench (which has Python 3.13, pdftoppm, pymupdf, imagemagick). Do NOT attempt `pip install` or `python3` locally — it will fail silently and waste turns.

### Step-by-step
1. **Check session history FIRST:**
```
session_search(query="Notability Google Drive <topic>", sort="newest", limit=3)
```
Why: prior sessions may contain the file IDs, pipeline debug logs, or the exact notes the user is referencing. Always search before calling APIs — the user explicitly told us to "check old threads" when we missed this. Session history often has the file IDs you need, saving an API round-trip.

2. **Check for new notes (if session history didn't have what you need):**
```
GOOGLEDRIVE_FIND_FILE:
  q: "'1WCXZxDJp80qw_GDUF96uBV7yjZqO1QSI' in parents and trashed = false"
  orderBy: "modifiedTime desc"
  pageSize: 5
```
Note: Notability creates nested folders (e.g. `Notability > Welcome > Note Jul 5, 2026 (2).pdf`). List children of subfolders to find actual PDFs. Files named `*.note` are native Notability format (unusable); only `*.pdf` exports work.
Note: Multiple documents may exist for different problems/topics — the user may reference "a separate document" for a different problem. List ALL files, not just the most recent one.

2. **Download the PDF:**
```
GOOGLEDRIVE_DOWNLOAD_FILE with fileId → returns s3url
```
Download via bun in terminal: `bun -e "const r = await fetch(s3url, {redirect:'follow'}); await Bun.write('note.pdf', await r.arrayBuffer());"`

3. **Convert to PNG (remote workbench — NOT local):**
```python
# Option A: pdftoppm (preferred — fastest, no Python deps needed)
import subprocess, os, glob
os.makedirs("/home/user/pages", exist_ok=True)
subprocess.run(["pdftoppm", "-png", "-r", "300", "/home/user/note.pdf", "/home/user/pages/page"])
files = sorted(glob.glob("/home/user/pages/*.png"))

# Option B: pymupdf (fallback)
import fitz
doc = fitz.open("/home/user/note.pdf")
for i, page in enumerate(doc):
    pix = page.get_pixmap(dpi=300)
    pix.save(f"/home/user/pages/page-{i+1:02d}.png")
```
300 DPI recommended for handwriting (200 DPI works but 300 gives better recognition of small annotations).

4. **Upload for vision:**
```python
result, error = upload_local_file("/home/user/pages/page-1.png")
s3_url = result.get("s3_url")
```

5. **Analyze with vision (terminal bun):**
```bash
source /workspace/.env && bun -e "
  // Read PNG as base64, POST to OpenRouter
  // Use google/gemini-2.5-flash (proven for handwriting)
  // Pass as data:image/png;base64,{b64} in image_url content
"
```

### Vision model choice
- **`google/gemini-2.5-flash`** — proven for Apple Pencil handwriting, math notation, mixed English/Hindi. RECOMMENDED.
- `openai/gpt-4o-mini` — works but less reliable on messy handwriting
- `vision_analyze` tool — does NOT accept local PNG files (returns "Invalid image source"). Must use OpenRouter API directly with base64-encoded images.
- MiMo V2.5 has NO vision capability — always delegate to OpenRouter.

## Workflow

### 1. Student writes on iPad
- Open Notability → write equations/derivations
- Notability auto-syncs PDF to Google Drive → "Notability" folder
- Wait 1-2 minutes for sync

### 2. Teacher reads notes
- Pull latest PDF from Drive
- Convert to PNG, analyze with OpenRouter vision
- Transcribe all handwritten equations word-for-word

### 3. Quiz (Role Reversal)
Apply productive-struggle framework:
1. **Read the student's work first** — don't ask "what do you know?"
2. **Identify confused/missing parts** — quiz on those specifically
3. **Grade:** ✅ correct, ⚠️ partially right, ❌ wrong — one-line rationale
4. **Probe deeper:** "Why does this derivative work this way?" / "What's the geometric interpretation?"
5. **Bridge to next concept** — connect gaps to the next topic

### 4. Archive
After quizzing, move reviewed notes to ML-Notes folder:
```
GOOGLEDRIVE_MOVE_FILE with fileId and folderId: "1f_W5daQ6yaeZsZdoStqMYjekVniB7PvK"
```

## Quizzing Patterns for ML Equations
- **Information theory:** "Why does cross-entropy ≥ entropy? What's the KL gap?"
- **KL vs cross-entropy:** "What goes wrong if you directly optimize KL divergence?"
- **Backpropagation:** "You wrote ∂L/∂W — walk me through how this flows through the chain rule"
- **Attention:** "Draw Q, K, V matrices — which one attends to which?"
- **Gradient descent:** "What happens to this gradient when the loss landscape is flat?"
- **Regularization:** "Why does L2 penalize large weights more than small ones?"
- **Cross-attention:** "In your diagram, which Q/K pair are you computing?"

## User Preferences
- **Automate the pipeline** — don't ask for manual workarounds like screenshots when the Drive pipeline works. The user explicitly rejected "just screenshot and send" when the automated path was available.
- **Accept text answers too** — user sometimes answers quiz questions via Discord text instead of writing on iPad. Both are fine; don't block on iPad-only.
- **Grades should be concise** — one-line rationale per item, not lengthy explanations.
- **Bridge quickly** — after confirming understanding, move to the next concept. Don't over-drill.

## Composio Resilience
Composio MCP server is **unreliable** — it goes down periodically. When it fails, follow these steps IN ORDER. Do NOT skip ahead or fabricate anything.

1. **FIRST: Search session history** (`session_search(query="Notability Google Drive <topic>", sort="newest", limit=3)`). Prior sessions often contain file IDs, pipeline debug logs, or even the transcribed content. This is the cheapest and most reliable fallback — always do this before any API call.

2. **SECOND: If session history gave you file IDs**, try `GOOGLEDRIVE_DOWNLOAD_FILE` directly with those IDs (it may work even if `SEARCH_TOOLS` is down).

3. **THIRD: If no file IDs found anywhere**, ask the user to export from Notability manually (Share → Export as PDF → drop in Discord). This is a last resort — the user expects you to try the automated path first.

4. **NEVER fabricate file IDs.** Random IDs like `1G64aAq4xq0m4bKbDcNq1LZjx5jX5jX5j` always 404. If you don't have a real file ID from session history or API response, say you don't have it — don't guess.

5. **Retry with backoff, not blind repeats.** The Composio MCP server goes down periodically but often comes back within 1-2 minutes. If a call fails, wait briefly and retry — but vary the approach: try different tools (`GOOGLEDRIVE_FIND_FILE` vs `GOOGLEDRIVE_DOWNLOAD_FILE`), search session history, or use `COMPOSIO_REMOTE_WORKBENCH` with `proxy_execute`. The user said "retry again" and "figure it out not my problem" — they expect persistence. Give up only after 3+ attempts with genuinely different approaches, not after 2 identical retries.

6. **Be resourceful before asking the user.** The user said "figure it out not my problem" when asked to export manually. Exhaust all automated paths (session search, alternative tools, cached data) before requesting manual intervention.

## Pitfalls
- **Notability auto-backup format MUST be PDF** — defaults to `.note` which I can't read. User must change in Settings → Auto-backup → Format → PDF
- **Notability auto-backup may take 1-2 minutes** — don't assume instant sync
- **Notability folder structure is nested** — `Notability > Welcome > files`. The `Welcome` subfolder contains actual PDFs. Don't assume flat structure; always LIST_CHILDREN on subfolders.
- **GOOGLEDRIVE_DOWNLOAD_FILE returns s3url** — must download from that URL, not direct from Drive. The s3url is temporary (1 hour expiry) — use it promptly
- **iPad 9th gen has Lightning port** — Apple Pencil USB-C does NOT work with it. Must use Apple Pencil 1st gen or third-party Lightning-compatible stylus (like JAMJAKE)
- **Large PDFs (>20 pages)** — focus on the most recent pages first
- **If the Drive folder is empty**, remind student to check Notability sync settings
- **Notability exports are IMAGE-ONLY PDFs** — no text layer, no selectable text. `smart_file_extract` and `pdf-parse` produce garbled output. MUST convert to PNG and use vision analysis. Do not waste time on text extraction.
- **`vision_analyze` rejects local PNGs** — returns "Invalid image source". Use OpenRouter API directly with base64-encoded images instead.
- **Local Docker has no Python/pip/curl** — only `bun` is available. All heavy processing (PDF→PNG, OCR) must happen on the Composio remote workbench.
