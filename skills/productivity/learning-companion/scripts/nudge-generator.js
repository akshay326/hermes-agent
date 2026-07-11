#!/usr/bin/env bun
/**
 * Learning Companion — Nudge Generator
 * 
 * Pulls Readwise highlights, analyzes for learning signals,
 * generates evidence-based nudges, tracks feedback loops.
 * 
 * Usage: 
 *   bun nudge-generator.js --check          # Signal inventory (dry run)
 *   bun nudge-generator.js                  # Random nudge type
 *   bun nudge-generator.js --type prediction # Specific nudge type
 * 
 * Nudge types: connection, confusion, prediction, question, insight
 * 
 * Requires: READWISE_TOKEN in environment (source /workspace/.env)
 */

const fs = require('fs');
const path = require('path');

const READWISE_TOKEN = process.env.READWISE_TOKEN;
const TRACKING_FILE = path.join(__dirname, 'feedback-loops.json');

// Learning signal patterns (regex) — maps to learning science techniques
const SIGNALS = {
  confusion: [
    /confus/i, /not sure/i, /hmm/i, /unclear/i, /wait/i, 
    /i think.*but/i, /maybe.*wrong/i, /i'm.*lost/i
  ],
  prediction: [
    /i think.*will/i, /i bet/i, /my prediction/i, /probably/i,
    /i predict/i, /he.*will.*probably/i
  ],
  insight: [
    /oh wow/i, /surprised/i, /finally/i, /nice/i, /cool/i,
    /prior.*updated/i, /i was wrong/i, /turns out/i
  ],
  question: [
    /i'm curious/i, /wondering/i, /what would/i, /how does/i,
    /why.*does/i, /what if/i, /i want to know/i
  ],
  connection: [
    /connects? to/i, /like.*when/i, /similar to/i, /reminds me/i,
    /same as/i, /parallel/i, /both.*about/i
  ]
};

// Nudge type → learning science technique mapping
const TECHNIQUE_MAP = {
  connection: 'Interleaving (d=0.43, Rohrer & Taylor 2007)',
  confusion: 'Self-Explanation (d=0.55, Chi et al. 1989)',
  prediction: 'Elaborative Interrogation (d=0.46, Dunlosky et al. 2013)',
  question: 'Elaborative Interrogation (d=0.46, Dunlosky et al. 2013)',
  insight: 'Spaced Retrieval (d=0.50, Roediger & Karpicke 2006)'
};

async function fetchReadwise(pageSize = 50) {
  if (!READWISE_TOKEN) {
    console.error('READWISE_TOKEN not set. Run: source /workspace/.env');
    process.exit(1);
  }
  
  const r = await fetch(`https://readwise.io/api/v2/highlights/?page_size=${pageSize}&sort=recent`, {
    headers: { 'Authorization': `Token ${READWISE_TOKEN}` }
  });
  
  if (!r.ok) {
    console.error(`Readwise API error: ${r.status}`);
    process.exit(1);
  }
  
  return r.json();
}

function analyzeHighlights(highlights) {
  const signals = [];
  
  for (const h of highlights) {
    const text = h.text || '';
    const note = h.note || '';
    const combined = `${text} ${note}`;
    
    for (const [type, patterns] of Object.entries(SIGNALS)) {
      for (const pattern of patterns) {
        if (pattern.test(combined)) {
          signals.push({
            type,
            text: text.substring(0, 200),
            note: note.substring(0, 200),
            book: h.book?.title || 'Unknown',
            author: h.book?.author || 'Unknown',
            highlight_id: h.id,
            created_at: h.created_at
          });
          break;
        }
      }
    }
  }
  
  return signals;
}

function generateNudge(signals, nudgeType) {
  const filteredSignals = nudgeType 
    ? signals.filter(s => s.type === nudgeType)
    : signals;
  
  if (filteredSignals.length === 0) {
    if (signals.length === 0) return null;
    return signals[0];
  }
  
  return filteredSignals[Math.floor(Math.random() * filteredSignals.length)];
}

function trackNudge(nudge) {
  const data = fs.existsSync(TRACKING_FILE) 
    ? JSON.parse(fs.readFileSync(TRACKING_FILE, 'utf8'))
    : { version: 1, created: new Date().toISOString(), metrics: { total_nudges: 0, nudges_responded: 0, prior_updates_detected: 0, feedback_loop_rate: 0, weekly: {} }, nudges: [], prior_updates: [] };
  
  data.metrics.total_nudges++;
  
  const today = new Date().toISOString().split('T')[0];
  const weekKey = getWeekKey(today);
  if (!data.metrics.weekly[weekKey]) {
    data.metrics.weekly[weekKey] = { nudges: 0, responses: 0, prior_updates: 0 };
  }
  data.metrics.weekly[weekKey].nudges++;
  
  data.nudges.push({
    id: `nudge-${Date.now()}`,
    type: nudge.type,
    text: nudge.text,
    book: nudge.book,
    created_at: new Date().toISOString(),
    responded: false,
    prior_updated: false
  });
  
  if (data.nudges.length > 100) {
    data.nudges = data.nudges.slice(-100);
  }
  
  data.metrics.feedback_loop_rate = data.metrics.total_nudges > 0 
    ? data.metrics.nudges_responded / data.metrics.total_nudges 
    : 0;
  
  fs.writeFileSync(TRACKING_FILE, JSON.stringify(data, null, 2));
  return data;
}

function getWeekKey(dateStr) {
  const d = new Date(dateStr);
  const startOfYear = new Date(d.getFullYear(), 0, 1);
  const weekNumber = Math.ceil(((d - startOfYear) / 86400000 + startOfYear.getDay() + 1) / 7);
  return `${d.getFullYear()}-W${String(weekNumber).padStart(2, '0')}`;
}

async function main() {
  const args = process.argv.slice(2);
  const checkMode = args.includes('--check');
  const typeIdx = args.indexOf('--type');
  let nudgeType = typeIdx !== -1 ? args[typeIdx + 1] : null;
  
  // Auto-select nudge type based on PDT time of day (when no --type given)
  if (!nudgeType && !checkMode) {
    const pdtHour = parseInt(new Date().toLocaleString('en-US', { timeZone: 'America/Los_Angeles', hour: 'numeric', hour12: false }));
    if (pdtHour < 10) nudgeType = 'prediction';       // morning (8-9 AM): elaborative interrogation
    else if (pdtHour < 14) nudgeType = 'connection';   // midday (10 AM-1 PM): interleaving
    else if (pdtHour < 17) nudgeType = 'confusion';    // afternoon (2-4 PM): self-explanation
    else nudgeType = 'insight';                         // evening (5+ PM): spaced retrieval
  }
  
  const data = await fetchReadwise(checkMode ? 20 : 50);
  const signals = analyzeHighlights(data.results || []);
  
  if (checkMode) {
    console.log(JSON.stringify({
      total_highlights: data.count,
      recent_analyzed: (data.results || []).length,
      signals_found: signals.length,
      signals_by_type: Object.entries(SIGNALS).reduce((acc, [type]) => {
        acc[type] = signals.filter(s => s.type === type).length;
        return acc;
      }, {}),
      technique_map: TECHNIQUE_MAP,
      tracking: JSON.parse(fs.existsSync(TRACKING_FILE) ? fs.readFileSync(TRACKING_FILE, 'utf8') : '{}').metrics || {}
    }, null, 2));
    return;
  }
  
  const nudge = generateNudge(signals, nudgeType);
  
  if (!nudge) {
    console.log('No signals found in recent highlights. Try reading more and leaving notes!');
    return;
  }
  
  const tracking = trackNudge(nudge);
  
  const typeEmoji = {
    connection: '🔗',
    confusion: '❓',
    prediction: '🎯',
    question: '💡',
    insight: '✨'
  };
  
  const output = {
    nudge_type: nudge.type,
    emoji: typeEmoji[nudge.type] || '📌',
    technique: TECHNIQUE_MAP[nudge.type],
    source: `${nudge.book} by ${nudge.author}`,
    your_text: nudge.text,
    your_note: nudge.note,
    nudge_prompt: generateNudgePrompt(nudge),
    metrics: {
      total_nudges: tracking.metrics.total_nudges,
      feedback_loop_rate: (tracking.metrics.feedback_loop_rate * 100).toFixed(1) + '%',
      prior_updates: tracking.metrics.prior_updates_detected
    }
  };
  
  console.log(JSON.stringify(output, null, 2));
}

function generateNudgePrompt(nudge) {
  const prompts = {
    connection: `Your highlight says: "${nudge.text.substring(0, 100)}..." — Can you connect this to something else you've read recently? What's the structural similarity?`,
    confusion: `You wrote: "${nudge.note.substring(0, 100)}" — What specifically is unclear? Try to articulate the confusion in one sentence.`,
    prediction: `Your note says: "${nudge.note.substring(0, 100)}" — Was your prediction right? What did you miss?`,
    question: `You asked: "${nudge.note.substring(0, 100)}" — Have you found the answer? If so, does it update your prior?`,
    insight: `You noted: "${nudge.note.substring(0, 100)}" — Can you explain what surprised you and why? That's self-explanation in action.`
  };
  
  return prompts[nudge.type] || prompts.connection;
}

main().catch(console.error);
