# Composio Google Drive Query Patterns

## Overview

`GOOGLEDRIVE_FIND_FILE` uses Google Drive API v3 query syntax. This reference documents patterns useful for cron jobs, automated monitoring, and file discovery workflows.

## Basic Query Syntax

```
GOOGLEDRIVE_FIND_FILE(
    folder_id: "<folder_id>",
    q: "<query>",
    fields: "nextPageToken,files(id,name,mimeType,size,createdTime)",
    pageSize: 50
)
```

## Common Query Patterns

### Find files by MIME type
```
q: "mimeType = 'image/png'"
q: "mimeType = 'application/pdf'"
q: "mimeType contains 'image/'"  # all images
```

### Find files in a folder
```
folder_id: "1wr0vOYECrLWPhFpOZI5VqqkoZRKBoYRn"
# OR
q: "'1wr0vOYECrLWPhFpOZI5VqqkoZRKBoYRn' in parents"
```

### Find recent files (last N minutes)
```
# Current time: 2026-07-04T01:06:23Z
# Files created in last 5 minutes:
q: "createdTime > '2026-07-04T01:01:23Z'"

# Files modified today:
q: "modifiedTime > '2026-07-04T00:00:00Z'"

# Combined: PNG files in folder created in last hour
q: "mimeType = 'image/png' and createdTime > '2026-07-04T00:06:23Z'"
```

### Exclude trashed files
```
q: "trashed = false"
```

### Find files by name
```
q: "name contains 'report'"
q: "name = 'exact-name.png'"
```

## Pagination

When results include `nextPageToken`, paginate:

```javascript
let allFiles = [];
let pageToken = null;

do {
  const args = {
    folder_id: FOLDER_ID,
    q: "mimeType = 'image/png' and trashed = false",
    fields: "nextPageToken,files(id,name,mimeType,size,createdTime)",
    pageSize: 100
  };
  if (pageToken) args.pageToken = pageToken;
  
  const result = await COMPOSIO_MULTI_EXECUTE_TOOL([{
    tool_slug: "GOOGLEDRIVE_FIND_FILE",
    arguments: args
  }]);
  
  const data = result.data.results[0].response.data;
  allFiles.push(...(data.files || []));
  pageToken = data.nextPageToken;
} while (pageToken);
```

## Cron Job Pattern: Monitor for New Files

```javascript
// Calculate timestamp for "last 5 minutes"
const now = new Date();
const fiveMinAgo = new Date(now.getTime() - 5 * 60 * 1000);
const timestamp = fiveMinAgo.toISOString();

// Query for new PNGs
const result = await COMPOSIO_MULTI_EXECUTE_TOOL([{
  tool_slug: "GOOGLEDRIVE_FIND_FILE",
  arguments: {
    folder_id: "1wr0vOYECrLWPhFpOZI5VqqkoZRKBoYRn",
    q: `mimeType = 'image/png' and createdTime > '${timestamp}'`,
    fields: "nextPageToken,files(id,name,mimeType,size,createdTime)",
    pageSize: 50
  }
}]);

const files = result.data.results[0].response.data.files || [];
if (files.length === 0) {
  // No new files - nothing to process
  return;
}

// Process each new file
for (const file of files) {
  // Download and analyze...
}
```

## Verified Query Patterns (Tested 2026-07-04)

| Query | Result | Notes |
|-------|--------|-------|
| `folder_id: "..."` + `q: "trashed=false"` | ✅ Returns all non-trashed files | Works for personal Drive |
| `folder_id: "..."` + `q: "mimeType = 'image/png'"` | ✅ Returns PNG files only | MIME type filter works |
| `folder_id: "..."` + `q: "mimeType = 'image/png' and createdTime > '...'"` | ✅ Returns recent PNGs | Date filter works |
| `folder_id: "..."` + `q: "createdTime > '...'"` | ✅ Returns recent files | Date-only filter works |

## Fallback: GOOGLEDRIVE_LIST_CHILDREN_V2

If `GOOGLEDRIVE_FIND_FILE` returns empty for a valid folder:

1. Could be shared drive — add `driveId` and `corpora: "drive"`
2. Could be permission issue — verify folder access
3. Use `GOOGLEDRIVE_LIST_CHILDREN_V2` as alternative

```javascript
const result = await COMPOSIO_MULTI_EXECUTE_TOOL([{
  tool_slug: "GOOGLEDRIVE_LIST_CHILDREN_V2",
  arguments: {
    folder_id: "1wr0vOYECrLWPhFpOZI5VqqkoZRKBoYRn"
  }
}]);
```

## File Metadata Fields

Request only needed fields for efficiency:

| Field | Description |
|-------|-------------|
| `id` | File ID (required for download) |
| `name` | Filename |
| `mimeType` | MIME type |
| `size` | File size in bytes (string) |
| `createdTime` | RFC 3339 timestamp |
| `modifiedTime` | RFC 3339 timestamp |
| `webViewLink` | Browser URL |

Recommended fields for monitoring:
```
fields: "nextPageToken,files(id,name,mimeType,size,createdTime)"
```

## Common Gotchas

1. **`size` is returned as string** — normalize to integer if comparing
2. **Date format must be RFC 3339** — `2026-07-04T01:01:23Z` (with `Z` for UTC)
3. **`createdTime` vs `modifiedTime`** — use `createdTime` for "new uploads", `modifiedTime` for "recent changes"
4. **Empty results don't mean error** — folder might be empty or no files match query
5. **Page token reuse** — must use exact `nextPageToken` from response, don't modify
