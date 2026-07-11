#!/usr/bin/env bun
/**
 * Notion Direct API — Eval Harness
 * 
 * Tests 5 operations in sequence, each must pass.
 * Run: source /workspace/.env && bun evals/notion-eval.js
 * 
 * Pass criteria: all 5 ops succeed (200 status, valid response).
 * Each op retries up to 3x before failing.
 */

const NOTION_TOKEN = process.env.NOTION_TOKEN;
const RESEARCH_DB = process.env.NOTION_RESEARCH_DB_ID;
const PROMPTS_DB = process.env.NOTION_PROMPTS_DB_ID;
const API_VER = "2022-06-28";

const headers = {
  "Authorization": `Bearer ${NOTION_TOKEN}`,
  "Notion-Version": API_VER,
  "Content-Type": "application/json"
};

let passed = 0;
let failed = 0;

async function test(name, fn, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    try {
      const result = await fn();
      if (result.ok) {
        passed++;
        console.log(`  ✅ ${name} (attempt ${attempt})${result.detail ? ": " + result.detail : ""}`);
        return;
      }
      console.log(`  ⚠️  ${name} attempt ${attempt}: ${result.error}`);
      if (attempt < retries) await new Promise(r => setTimeout(r, 1500));
    } catch (e) {
      console.log(`  ⚠️  ${name} attempt ${attempt}: ${e.message}`);
      if (attempt < retries) await new Promise(r => setTimeout(r, 1500));
    }
  }
  failed++;
  console.log(`  ❌ ${name} FAILED after ${retries} attempts`);
}

// TEST 1: Token validity
async function testTokenAuth() {
  const r = await fetch("https://api.notion.com/v1/users/me", { headers });
  const d = await r.json();
  if (r.status === 200 && d.type === "bot") return { ok: true, detail: `bot=${d.name}` };
  return { ok: false, error: `status=${r.status} ${d.message || ""}` };
}

// TEST 2: Fetch database schema
async function testFetchSchema() {
  const r = await fetch(`https://api.notion.com/v1/databases/${RESEARCH_DB}`, { headers });
  const d = await r.json();
  if (r.status === 200 && d.properties) {
    const propNames = Object.keys(d.properties);
    return { ok: true, detail: `${propNames.length} properties: ${propNames.join(", ")}` };
  }
  return { ok: false, error: `status=${r.status} ${d.message || ""}` };
}

// TEST 3: Create a test page
let testPageId = null;
async function testCreatePage() {
  const r = await fetch("https://api.notion.com/v1/pages", {
    method: "POST", headers,
    body: JSON.stringify({
      parent: { database_id: RESEARCH_DB },
      properties: {
        "lesson": { title: [{ text: { content: `EVAL-TEST ${new Date().toISOString()}` } }] },
        "Tags": { multi_select: [{ name: "Meta" }] },
        "Year": { number: 2026 },
        "source_transcript": { rich_text: [{ text: { content: "Automated eval test — safe to delete" } }] },
        "rational evidence": { rich_text: [{ text: { content: "Created by notion-eval.js" } }] }
      }
    })
  });
  const d = await r.json();
  if (r.status === 200 && d.id) { testPageId = d.id; return { ok: true, detail: `page_id=${d.id}` }; }
  return { ok: false, error: `status=${r.status} ${JSON.stringify(d).substring(0, 200)}` };
}

// TEST 4: Add body content
async function testAddContent() {
  if (!testPageId) return { ok: false, error: "no test page created" };
  const blocks = [
    { object: "block", type: "heading_2", heading_2: { rich_text: [{ type: "text", text: { content: "Eval Test" } }] } },
    { object: "block", type: "paragraph", paragraph: { rich_text: [{ type: "text", text: { content: "Test content. Safe to delete." } }] } },
    { object: "block", type: "bulleted_list_item", bulleted_list_item: { rich_text: [{ type: "text", text: { content: "Test bullet" } }] } },
  ];
  const r = await fetch(`https://api.notion.com/v1/blocks/${testPageId}/children`, {
    method: "PATCH", headers, body: JSON.stringify({ children: blocks })
  });
  const d = await r.json();
  if (r.status === 200 && d.results?.length === 3) return { ok: true, detail: `${d.results.length} blocks added` };
  return { ok: false, error: `status=${r.status} blocks=${d.results?.length || 0}` };
}

// TEST 5: Query database
async function testQueryDatabase() {
  const r = await fetch(`https://api.notion.com/v1/databases/${RESEARCH_DB}/query`, {
    method: "POST", headers, body: JSON.stringify({ page_size: 3 })
  });
  const d = await r.json();
  if (r.status === 200 && d.results?.length > 0) {
    const titles = d.results.map(p => p.properties.lesson?.title?.[0]?.plain_text || "?").join(", ");
    return { ok: true, detail: `${d.results.length} pages: ${titles}` };
  }
  return { ok: false, error: `status=${r.status} results=${d.results?.length || 0}` };
}

// Cleanup: archive test page
async function cleanup() {
  if (!testPageId) return;
  try {
    await fetch(`https://api.notion.com/v1/pages/${testPageId}`, {
      method: "PATCH", headers, body: JSON.stringify({ archived: true })
    });
    console.log(`\n🧹 Test page ${testPageId} archived.`);
  } catch (e) { console.log(`\n⚠️  Could not archive: ${e.message}`); }
}

// MAIN
console.log("╔══════════════════════════════════════╗");
console.log("║   Notion Direct API — Eval Harness   ║");
console.log("╚══════════════════════════════════════╝\n");

if (!NOTION_TOKEN) { console.error("❌ NOTION_TOKEN not set. Source /workspace/.env first."); process.exit(1); }

console.log("Running 5 operations (3-retry each)...\n");
await test("1. Token Auth", testTokenAuth);
await test("2. Fetch Schema", testFetchSchema);
await test("3. Create Page", testCreatePage);
await test("4. Add Content", testAddContent);
await test("5. Query Database", testQueryDatabase);
await cleanup();

console.log("\n══════════════════════════════════════");
console.log(`RESULT: ${passed}/5 passed, ${failed}/5 failed`);
if (failed === 0) console.log("🎉 ALL TESTS PASSED.");
else { console.log("💥 SOME TESTS FAILED."); process.exit(1); }
