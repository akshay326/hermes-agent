#!/usr/bin/env bun
/**
 * plan-and-deploy.js — GLM-5.2 plans, smaller agents execute
 * 
 * Usage: bun run plan-and-deploy.js "your complex question"
 * 
 * Flow:
 *   1. GLM-5.2 breaks question into 2-4 tasks
 *   2. Each task executed in parallel on executor model
 *   3. Results collected and displayed
 */

import { readFileSync } from 'fs';

const env = readFileSync('/workspace/.env', 'utf8');
const lines = env.split('\n');
const OPENCODE_KEY = lines.find(l => l.startsWith('OPENCODE_API_KEY='))?.split('=')[1];
const OPENROUTER_KEY = lines.find(l => l.startsWith('OPENROUTER_API_KEY='))?.split('=')[1];

const EXECUTOR_MODEL = 'moonshotai/kimi-k2';

async function createPlan(question) {
  console.log('📋 Step 1: GLM-5.2 creating plan...\n');
  
  const resp = await fetch('https://opencode.ai/zen/go/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + OPENCODE_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'glm-5.2',
      messages: [
        { role: 'system', content: `You are a planner. Break the user's question into 2-4 independent tasks.
Each task should be self-contained and answerable without context from other tasks.

Reply in this EXACT format (no other text):
TASK 1: <description>
TASK 2: <description>
TASK 3: <description>` },
        { role: 'user', content: question }
      ],
      max_tokens: 500
    })
  });

  const data = await resp.json();
  const content = data.choices?.[0]?.message?.content || '';
  
  const tasks = content.match(/TASK \d+:.+/g)?.map(t => 
    t.replace(/TASK \d+:\s*/, '').trim()
  ) || [question];
  
  console.log(`Found ${tasks.length} tasks:`);
  tasks.forEach((t, i) => console.log(`  ${i+1}. ${t}`));
  console.log('');
  
  return tasks;
}

async function executeTask(task, index) {
  console.log(`⚡ Step 2.${index+1}: Executing on ${EXECUTOR_MODEL}...`);
  
  const resp = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer ' + OPENROUTER_KEY,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: EXECUTOR_MODEL,
      messages: [{ role: 'user', content: task }],
      max_tokens: 500
    })
  });

  const data = await resp.json();
  return data.choices?.[0]?.message?.content || 'No response';
}

const question = process.argv.slice(2).join(' ');
if (!question) {
  console.log('Usage: bun run plan-and-deploy.js "your question"');
  process.exit(1);
}

console.log(`\n🔍 Question: ${question}\n`);

const tasks = await createPlan(question);

console.log('🚀 Step 2: Executing tasks in parallel...\n');
const results = await Promise.all(
  tasks.map((task, i) => executeTask(task, i))
);

console.log('\n📊 Results:\n');
results.forEach((result, i) => {
  console.log(`--- Task ${i+1} ---`);
  console.log(result);
  console.log('');
});

console.log('✅ Done.');
