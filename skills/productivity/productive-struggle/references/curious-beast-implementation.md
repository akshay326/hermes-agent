# Curious Beast Pattern — Implementation Notes

## Session Example (2026-07-07)
User was annotating Karpathy's "Let's build GPT from scratch" video and discovered nanoChat repo.
They had 7+ questions about advanced terms (flash-attention-3, sliding window, GQA, etc.).

## What Worked
1. **Fetched context first** — Readwise highlights + Notion learning path to understand where user is
2. **Investigated the topic** — Read nanoChat repo, found the actual code locations
3. **Saved questions to Notion** — Created page in research-db with all questions organized
4. **Focused on ONE decision** — "Should I continue the video or explore nanochat first?"
5. **Gave ONE question to think about** — Sliding window intuition question

## What Didn't Work (Initial)
- Asked questions about sliding windows before user had attention-mechanism foundation
- User had to redirect: "should i continue with the video?"
- The productive-struggle skill's "NEVER introduce a prerequisite" rule applies across projects

## Notion Schema Used
Database: research-db (38910db4-1d13-8008-a491-d8091db7914e)
Properties:
- `lesson` (title) — Question topic
- `Tags` (multi_select) — learning, nanochat, karpathy
- `Year` (number) — 2026
- `rational evidence` (rich_text) — Context/sources
- `source_transcript` (rich_text) — Video timestamps/Readwise URLs

## Template for Future Sessions
When user has many questions and says "save them for later":
1. Fetch Readwise highlights to see what they've been reading
2. Check Notion learning path for current position
3. Investigate the topic enough to organize the questions
4. Save to Notion with structured schema
5. Return to the user with ONE decision point and ONE question to think about
