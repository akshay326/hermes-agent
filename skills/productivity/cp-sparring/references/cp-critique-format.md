# CP Critique Format

Template for reviewing LeetCode solutions from Notability handwritten notes.

## Structure

### 1. Problem Statement
Restate the problem in 1-2 sentences. Include constraints if visible.

### 2. Your Approaches
For each solution variant the user wrote:

```
**Approach N: [Name]**
- How it works: [1-2 sentences]
- Time: O(...) | Space: O(...)
- Correct: ✅ / ⚠️ / ❌
```

### 3. What's Solid
Affirm correct insights and good reasoning patterns. Be specific — "good use of hash map" not "nice work".

### 4. Issues
For each problem found:
- What's wrong (specific bug or edge case)
- Why it breaks (the mechanics)
- The fix (point to it, don't solve the whole thing)

### 5. Next Problems
4-6 problems that build on the pattern just practiced. Format:

| # | Problem | Why |
|---|---------|-----|
| XX | **Name** (LC XX) | [1 sentence: what skill it builds] |

Prioritize problems that use the same data structure or algorithmic pattern.

## Example (LC 49 - Group Anagrams)

### Problem
Group strings that are anagrams of each other. S = ["act", "cat", "tan", "bat", "area"].

### Your Approaches

**Approach 1: Sorting-based encoding**
- Sort each word's characters as key, group by key
- Time: O(n × k log k) | Space: O(n × k)
- Correct: ✅

**Approach 2: Character count encoding**
- Count character frequencies as tuple key
- Time: O(n × k) | Space: O(n × 26)
- Correct: ✅ — this is optimal

**Approach 3: Polynomial encoding (power of 26)**
- Map chars to powers of 26, sum as key
- Time: O(n × k) | Space: O(n)
- Correct: ⚠️ — overflow risk with large strings, possible hash collisions

### What's Solid
- Correctly identified that order doesn't matter, only character counts
- Progression from sorting → counting → number theory shows good algorithmic thinking

### Issues
- Approach 3 doesn't handle overflow for |W| > 15 chars in fixed-width ints
- Missing: what's the output format for singleton words with no anagram partners?

### Next Problems
| # | Problem | Why |
|---|---------|-----|
| 242 | **Valid Anagram** | Simpler version, cements count approach |
| 149 | **Max Points on a Line** | Same polynomial/encoding thinking with slopes |
| 347 | **Top K Frequent Elements** | Heap + counting, builds on frequency encoding |
