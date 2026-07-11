#!/usr/bin/env bun
/**
 * plan.js — One-shot GLM-5.2 call via OpenCode Go
 * 
 * Usage: bun run plan.js "your deep reasoning question"
 */

import { readFileSync } from 'fs';

const env = readFileSync('/workspace/.env', 'utf8');
const lines = env.split('\n');
const OPENCODE_KEY = lines.find(l => l.startsWith('OPENCODE_API_KEY='))?.split('=')[1];

if (!OPENCODE_KEY) {
  console.error('ERROR: OPENCODE_API_KEY not found in /workspace/.env');
  process.exit(1);
}

const message = process.argv.slice(2).join(' ');
if (!message) {
  console.log('Usage: bun run plan.js "your question"');
  process.exit(1);
}

const resp = await fetch('https://opencode.ai/zen/go/v1/chat/completions', {
  method: 'POST',
  headers: {
    'Authorization': 'Bearer ' + OPENCODE_KEY,
    'Content-Type': 'application/json'
  },
  body: JSON.stringify({
    model: 'glm-5.2',
    messages: [
      { role: 'system', content: 'You are a planner model. Think step by step. Be concise but thorough.' },
      { role: 'user', content: message }
    ],
    max_tokens: 2000
  })
});

if (!resp.ok) {
  console.error(`API error: ${resp.status} ${await resp.text()}`);
  process.exit(1);
}

const data = await resp.json();
const choice = data.choices?.[0];

console.log(`Model: ${data.model}`);
console.log('---');
if (choice?.message?.reasoning_content) {
  console.log(`[Reasoning]:\n${choice.message.reasoning_content}\n`);
}
console.log(`[Response]:\n${choice?.message?.content}`);
console.log(`\n[Tokens]: ${data.usage?.total_tokens}`);
