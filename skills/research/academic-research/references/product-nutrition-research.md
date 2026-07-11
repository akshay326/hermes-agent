# Product Nutrition Research — Patterns & Pitfalls

## Workflow: Researching a Consumer Product + Its Ingredients

When a user asks "research [product name]" with nutritional specs:

### Step 1: Verify Brand & Product Identity
**Pitfall:** Users often misattribute products to the wrong brand. The wrapper specs (protein/calories/sugar/weight) may not match the named brand.
- Search: `"[product name]" "[protein]g protein" "[calories] calories" nutrition`
- If specs don't match the named brand, search for the actual brand
- Report the discrepancy immediately: "Important Note: The specs you described match [actual brand], not [named brand]"

### Step 2: Full Nutrition Facts
- Search: `"[brand] [flavor] nutrition facts ingredients label"`
- Compile: calories, fat, carbs, fiber, sugar, sugar alcohols, protein, serving size
- Extract full ingredient list, grouped by functional system (protein, binding, fat, flavor)

### Step 3: Identify Key Ingredients
Categorize ingredients by research priority:
1. **Protein sources** — whey, casein, collagen, milk protein isolate, egg white, pea, etc.
2. **Sweeteners** — sugar alcohols (maltitol, erythritol, sorbitol), rare sugars (allulose), artificial (sucralose, aspartame, acesulfame K)
3. **Novel fats** — EPG (esterified propoxylated glycerol), Olean, etc.
4. **Fiber additives** — soluble corn fiber, inulin, chicory root, etc.
5. **Common additives** — glycerin, soy lecithin, etc. (usually skip unless flagged)

### Step 4: Peer-Reviewed Research per Ingredient
Search strategy per ingredient:
- **Protein sources:** PubMed for "whey protein muscle protein synthesis meta-analysis [year range]"
- **Sweeteners:** PubMed for "[sweetener name] health effects [year range]"
- **Sugar alcohols:** Focus on GI tolerance studies and glycemic index data
- **Novel fats:** Focus on safety/toxicity studies and FDA GRAS status

Use the academic-research multi-round strategy:
- Round 1: Broad web searches for overviews
- Round 2: PubMed for citation details
- Round 3: Gap-filling (safety, long-term, specific populations)

### Step 5: Daily Consumption Analysis
For "X bars/day" scenarios, calculate:
- Total protein, calories, carbs from bars
- Compare to user's daily protein needs (1.6-2.2g/kg/day for body recomposition)
- Identify GI concerns (maltitol tolerance: 17-40g/day)
- Note ultra-processing classification if relevant

### Step 6: Structured Output
Format: Nutrition Facts table → Ingredients → Protein Source Analysis → Sweetener Research → Health Considerations → Citations

Include a summary table:
| Ingredient | Evidence Level | Primary Concern | Severity |
|---|---|---|---|

## Key Pitfalls

1. **Brand mismatch:** Always verify product identity before deep-diving research
2. **Sugar alcohol math:** Net carbs = total carbs - fiber - sugar alcohols. Sugar alcohols contribute ~0-3 kcal/g depending on type (erythritol = 0, maltitol = 2.1)
3. **Protein blend leucine threshold:** ~4.5-5g leucine needed for muscle protein synthesis. Collagen is low in leucine; blends with milk protein isolate or whey are well-designed
4. **GI tolerance:** Maltitol has lowest tolerance threshold among sugar alcohols (~17g for sensitive populations)
5. **Ultra-processing context:** If classifying as ultra-processed (NOVA Group 4), note that observational associations don't prove causation

## Common Search Patterns

### For protein bars:
```
"[brand] [flavor] nutrition facts ingredients"
"[protein source] muscle protein synthesis peer reviewed [year]"
"[sweetener] health effects gut microbiome [year]"
"daily protein bar consumption health effects [year]"
```

### For supplements:
```
"[ingredient] GRAS status FDA safety"
"[ingredient] long-term effects clinical trial"
"[ingredient] interactions with [other ingredient]"
```
