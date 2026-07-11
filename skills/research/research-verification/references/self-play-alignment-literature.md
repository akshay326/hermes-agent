# Self-Play in LLM Alignment — Literature Survey (2026-07-10, updated)

## Self-Play as Alignment Technique (15+ papers)

| Paper | Authors | Venue | Key Idea |
|-------|---------|-------|----------|
| AI Safety via Debate | Irving, Christiano, Amodei | 2018 | Two agents debate, human judges. 4000+ citations. |
| SPIN | Chen et al. | ICML 2024 | Model competes against frozen copy of itself |
| SPPO | Wu et al. | ICLR 2025 | Two-player game for preference optimization |
| SPAG | Cheng et al. | NeurIPS 2024 | Adversarial language game (Taboo) |
| RSPO | Tang et al. | 2025 | Game-theoretic regularization for self-play |
| SPAC | Ji et al. | 2024 | Adversarial critic for offline alignment |
| Evolving Alignment | Ye et al. (DeepMind) | 2024 | Open-ended RLHF with evolving prompts |
| SPIRAL | Liu et al. | 2025 | Multi-agent multi-turn RL |
| Chasing Moving Targets | Liu et al. | 2025 | Online self-play RL for safety alignment |
| TriPlay-RL | Tan et al. | ACL 2026 | Tri-role self-play for safety |

## Constitutional AI as Self-Play

- **Bai et al. (Anthropic, 2022)** — Model critiques its own outputs against principles. Structurally self-play, but paper doesn't use the term.
- **ITERALIGN** (NAACL 2024) — Iterative constitutional alignment, closer to explicit self-play.
- **Self-Rewarding LM** (Yuan et al., 2024) — Model is both policy and judge, iteratively improving via DPO.

## Debate as Self-Play

- **Irving, Christiano, Amodei (2018)** — "AI Safety via Debate" — foundational paper. Two agents debate, human judges. 4000+ citations.
- **Brown-Cohen et al. (2024)** — Scalable AI Safety via Doubly-Efficient Debate
- **Arnesen et al. (2024)** — First empirical validation: self-play debate improves judge accuracy

## Human Learning ↔ LLM Training Parallels

| Paper | Venue | Key Idea |
|-------|-------|----------|
| Wu et al. (2025) | OpenReview | Cognitive framework for LLM learning |
| Vetcha (2025) | — | Human-pedagogy inspired LLM fine-tuning |
| Yan et al. (2024) | ICML | LLM journey from cognition to expression |
| Sun & van der Schaar (2025) | arXiv:2507.13158 | IRL for LLMs parallels human value inference |
| Chen et al. (2025) | — | SFT = worked examples, RL = independent practice |
| Generativism (2026) | arXiv:2606.12441 | New learning theory for generative AI age |

## The Gap

**Explicit synthesis: human self-play cognition ↔ LLM self-play alignment as unified framework** — NOT FOUND.

This is the novel contribution. The components are well-explored, but no paper unifies human self-play learning (mental simulation, self-talk, metacognition) with LLM self-play alignment (SPIN, Constitutional AI, debate).

## Key Insight for Blog Thesis

Self-play works for humans AND for LLMs because both systems have the same failure mode: they optimize for the *easy* signal instead of the *hard* signal.

- Humans optimize for "I feel like I understand" (effortless) instead of "I can explain it to someone else" (effortful)
- LLMs optimize for "I get a high reward score" (easy) instead of "I'm actually aligned" (hard)

Self-play forces both systems to confront the gap between *perceived* competence and *actual* competence.
