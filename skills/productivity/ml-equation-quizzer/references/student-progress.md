# Student Progress — ML Learning Path

## Current State (as of July 6, 2026)

### Completed ✅
- **Shannon Entropy:** H(P) = −∑ p(xᵢ) log(p(xᵢ)) — student can write and explain
- **Cross-Entropy:** H(P,Q) = −∑ p(xᵢ) log(q(xᵢ)) — student can write and explain
- **KL Divergence:** D_KL(P‖Q) = ∑ p(xᵢ) log(p(xᵢ)/q(xᵢ)) — student can write and explain
- **Entropy decomposition:** H(P,Q) = D_KL(P‖Q) + H(P) — student derived correctly
- **Why cross-entropy ≥ entropy:** Student proved via D_KL ≥ 0 (Gibbs' inequality)
- **Why optimize cross-entropy, not KL:** Student understood the one-hot simplification and that H(P) is constant
- **One-hot simplification:** H(P,Q) = −log(q(x*)) for one-hot labels — student derived correctly

### Partially Understood ⚠️
- **Softmax:** Student saw the formula Z(x) = e^(xᵢ)/∑e^(xⱼ) but hasn't formally studied it
- **Softmax derivative:** Student tried to derive ∂H/∂x but mixed up sigmoid and softmax derivatives
- **Cross-entropy + softmax gradient:** Student got stuck here — the derivation ∂H/∂xⱼ = q(xⱼ) − p(xⱼ) was shown but not fully internalized

### Not Yet Covered ❌
- **Backpropagation:** Next topic in the learning path
- **Chain rule through softmax:** The identity ∂q(xᵢ)/∂xⱼ = q(xᵢ)(δᵢⱼ − q(xⱼ)) was shown but not practiced
- **Practical training loop:** How loss → gradients → weight updates actually works

## Key Formulas the Student Has Written
See the KL-Divergence.pdf in Google Drive (ID: 1cEGKmuh8NTU1b0bDCMZtjQhtH3PKSTcB) for the student's handwritten versions.

## Next Session Should Cover
1. Softmax as a formal concept (not just a formula)
2. The softmax derivative identity
3. Deriving ∂H/∂xⱼ = q(xⱼ) − p(xⱼ) step by step
4. Then bridge to backpropagation

## Notes on Student's Learning Style
- Writes equations on iPad, expects teacher to read via Google Drive pipeline
- Gets frustrated when asked to derive through 4+ concepts at once
- Better at conceptual understanding than algebraic manipulation
- Prefers "why does this work" over "derive this formula"
- When stuck, needs the derivation shown with ONE gap to fill, not a full walkthrough
