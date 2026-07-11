# Practice Examples — Six Moves in Action

## Example 1: Debugging Code

**Without six moves (unguarded):**
```
You: "My function returns None, fix it"
AI: *rewrites entire function*
You: "Thanks" ← nothing stuck
```

**With six moves (guarded):**
```
You: [Move 1-2] "I'm trying to parse this CSV. It returns None on line 15.
     I think the issue is with how I'm reading the file, but I'm not sure."
AI:   [Move 3] "Look at line 12 — you're calling .read() on a closed handle.
      Try moving the open() inside the function."
You: [Move 4-5] Fix it. Hit another error. Try 2 more fixes.
You: [Move 6] Close AI. Write a test. It passes.
```

## Example 2: Learning a New Concept (e.g., React Hooks)

**Without six moves:**
```
You: "Explain React hooks to me"
AI: *500-word explanation*
You: *reads, nods, forgets in 2 hours*
```

**With six moves:**
```
You: [Move 1] Read the React docs for 10 min. Write down: "Hooks let you
     use state in function components. useState returns [value, setter]."
AI:   [Move 3] "Good start. But you're missing the dependency array in
      useEffect — that's what controls when it re-runs. What do you
      think happens if you leave it empty?"
You: [Move 4] "Oh — it only runs once, like componentDidMount?"
AI:   [Move 5] "Exactly. Now build a small component that fetches data
      on mount. Come back when you've tried."
You: [Move 6] Close AI. Build it. Explain it to a colleague.
```

## Example 3: Writing an Essay

**Without six moves:**
```
You: "Write me a 1000-word essay on climate policy"
AI: *writes essay*
You: *submits it, learns nothing*
```

**With six moves:**
```
You: [Move 1] Spend 15 min. Write your thesis + 3 supporting points.
You: [Move 2] Draft paragraph 1. It's messy but it's yours.
AI:   [Move 3] "Your thesis is clear, but paragraph 2 needs evidence.
      What data would support your claim about carbon pricing?"
You: [Move 4-5] Find the data. Revise. Write paragraphs 3-4 yourself.
You: [Move 6] Read final essay aloud. Does it sound like you?
```

## Example 4: Architecture Design

**Without six moves:**
```
You: "How should I design the auth system?"
AI: *draws full architecture with 8 services*
You: * implements it without understanding why*
```

**With six moves:**
```
You: [Move 1] Sketch your own design. "I'm thinking JWT + refresh tokens,
     stored in Redis. Users table in Postgres."
You: [Move 2] "I'm not sure how to handle token rotation though."
AI:   [Move 3] "Your base is solid. The gap is: what happens when a
      refresh token is stolen? Think about that threat model."
You: [Move 4] "Oh — I'd need token binding or device fingerprinting?"
AI:   [Move 5] "Yes. Research both approaches and sketch how either
      would fit your current design. Then we'll compare."
You: [Move 6] Present your revised design. Defend each choice.
```

## Example 5: Research (What We Just Did)

**Without six moves:**
```
You: "Find me interesting papers"
AI: *picks random papers*
You: *can't evaluate if they're relevant*
```

**With six moves:**
```
You: [Move 1] "Here's what's in my DB: cognitive debt, cognitive surrender,
     perfectionism, stress breathing, satisficing. I need something novel."
AI:   [Move 3] "Here's a paper on AI and the illusion of learning.
      It's novel because it provides a DESIGN FRAMEWORK, not just
      diagnosis. Does that fit your thread?"
You: [Move 4] "Yes — it closes the loop from 'AI erodes thinking' to
     'here's where to place AI to preserve it.'"
You: [Move 6] Read the paper yourself. Decide if it belongs in your DB.
```
