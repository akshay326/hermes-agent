# Google Drive Composio Tools — Quirks & Pitfalls

This document covers non-obvious behaviors when using Google Drive via Composio tools (GOOGLEDRIVE_FIND_FILE, GOOGLEDRIVE_LIST_CHILDREN_V2, etc.).

## File Listing: FIND_FILE vs LIST_CHILDREN_V2

**Problem:** `GOOGLEDRIVE_FIND_FILE` with a mime type filter can return empty results even when files exist in the folder.

**Example:**
- Folder contains: `Copy of Ak-test.drawio.png`
- Query: `mimeType = 'image/png'` with `folder_id` set
- Result: empty `files: []`

**Workaround:** Use `GOOGLEDRIVE_LIST_CHILDREN_V2` to enumerate folder contents, then check each file's metadata. This tool returns all children regardless of mime type.

```python
# More reliable folder enumeration
resp, _ = run_composio_tool('GOOGLEDRIVE_LIST_CHILDREN_V2', {'folderId': folder_id})
items = resp.get('data', {}).get('items', [])
# Then get metadata for each child
for item in items:
    file_id = item.get('id')
    meta_resp, _ = run_composio_tool('GOOGLEDRIVE_GET_FILE_METADATA', {'fileId': file_id, 'fields': 'id,name,mimeType,createdTime'})
    # Process metadata...
```

## Misleading File Extensions

**Critical Pitfall:** Files can have extensions that don't match their actual mime type.

| Filename | Actual mime type | Notes |
|----------|------------------|-------|
| `diagram.png` | `application/vnd.jgraph.mxfile` | DrawIO file, not PNG |
| `export.pdf` | `application/vnd.google-apps.document` | Google Doc, not PDF |
| `data.csv` | `application/vnd.google-apps.spreadsheet` | Google Sheet, not CSV |

**Why this matters:** Google Drive API returns the *actual* mime type, not what the filename suggests. When filtering by `mimeType = 'image/png'`, a DrawIO file named `something.png` will NOT match.

**Detection:** Always check `mimeType` from `GET_FILE_METADATA` before assuming file type. Don't rely on filename extensions.

## Pagination

`GOOGLEDRIVE_FIND_FILE` returns `nextPageToken` for multi-page results. **Always paginate** to get complete results — don't assume empty means no files.

```python
items = []
resp, _ = run_composio_tool('GOOGLEDRIVE_FIND_FILE', {...})
data = resp.get('data', {})
items += data.get('files', [])
tok = data.get('nextPageToken')
while tok:
    resp, _ = run_composio_tool('GOOGLEDRIVE_FIND_FILE', {..., 'pageToken': tok})
    data = resp.get('data', {})
    items += data.get('files', [])
    tok = data.get('nextPageToken')
```

## Recent File Searches

To find files created in the last N minutes, use `createdTime > '<ISO8601>'` in the query. However:
- The time granularity may not be perfect
- Files may be in a shared drive (requires `driveId` parameter)
- Empty results don't distinguish between "no files" and "permission denied"

**Recommended approach:**
1. First verify folder exists with `GET_FILE_METADATA`
2. Use `LIST_CHILDREN_V2` for reliable enumeration
3. Filter by `createdTime` in a post-processing step if needed

## DOWNLOAD_FILE mime_type Behavior

**Quirk:** `GOOGLEDRIVE_DOWNLOAD_FILE` ignores the `mime_type` parameter for non-Google Workspace files.

**Example:**
- File: `Copy of Ak-test.drawio.png` (actual mimeType: `application/vnd.jgraph.mxfile`)
- Request: `{'fileId': '...', 'mime_type': 'image/png'}`
- Response: `composio_execution_message: "Note: mime_type parameter was ignored. Non-Google Workspace files (mimeType=application/vnd.jgraph.mxfile) are downloaded in their native format."`

**Why this matters:** The `mime_type` parameter only works for exporting Google Workspace documents (Docs → PDF, Sheets → CSV, etc.). For regular files (images, PDFs, drawio, etc.), the file is always downloaded in its native format regardless of what `mime_type` you specify.

**Rule:** Don't rely on `mime_type` to convert non-Workspace files. If you need a specific format, check the actual mimeType first and handle accordingly.

## Common MIME Types

| Type | Constant | Use Case |
|------|----------|----------|
| `image/png` | `image/png` | PNG images |
| `image/jpeg` | `image/jpeg` | JPEG images |
| `application/pdf` | `application/pdf` | PDF documents |
| `application/vnd.google-apps.folder` | folder | Folders |
| `application/vnd.jgraph.mxfile` | DrawIO | Draw.io diagram files |
| `application/vnd.google-apps.document` | Google Doc | Google Docs |
| `application/vnd.google-apps.spreadsheet` | Google Sheet | Google Sheets |
| `application/vnd.google-apps.presentation` | Google Slides | Google Slides |

## Cron Job Pattern for Monitoring New Files

When setting up a cron job to detect new uploads:

1. **Don't rely solely on mime type filters** — they may miss files with wrong extensions
2. **Check file metadata after listing** — get actual mime type
3. **Handle the "empty but not really empty" case** — LIST_CHILDREN_V2 may find what FIND_FILE misses
4. **Use createdTime filtering carefully** — account for timezone and clock skew
5. **Consider multiple approaches** — if one tool returns empty, try another variant

## Troubleshooting

| Symptom | Likely Cause | Fix |
|---------|--------------|-----|
| FIND_FILE returns empty for known folder | Mime type filter mismatch | Use LIST_CHILDREN_V2 instead |
| File not matching expected type | Extension doesn't match actual mime type | Check GET_FILE_METADATA for real mimeType |
| Pagination stops early | Missing nextPageToken handling | Always check and iterate |
| Shared drive files not appearing | Missing driveId parameter | Use GOOGLEDRIVE_LIST_SHARED_DRIVES to find drive ID |
