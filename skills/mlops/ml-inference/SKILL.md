---
name: ml-inference
description: "ML inference and evaluation — llama.cpp local inference, vLLM serving, lm-eval-harness benchmarking, HuggingFace Hub model discovery. Covers quantization, GPU optimization, and OpenAI-compatible APIs."
version: 1.0.0
author: Hermes Agent
license: MIT
platforms: [linux, macos]
metadata:
  hermes:
    tags: [ML, Inference, LLM, vLLM, llama.cpp, GGUF, Evaluation, Benchmarking, HuggingFace, Quantization]
---

# ML Inference & Evaluation

Unified skill for running, serving, evaluating, and discovering LLMs. Covers local inference (llama.cpp), production serving (vLLM), benchmarking (lm-eval-harness), and model discovery (HuggingFace Hub).

## When to Use

- Running LLMs locally on CPU/GPU
- Deploying production LLM APIs
- Benchmarking model quality against standard tasks
- Finding the right GGUF/quant for hardware
- Comparing model performance

## 1. Local Inference (llama.cpp)

Run LLMs on CPU, Apple Silicon, CUDA, or Intel GPUs using GGUF format.

### Quick Start

```bash
# Install
brew install llama.cpp  # macOS/Linux

# Run from HuggingFace Hub
llama-server -hf bartowski/Llama-3.2-3B-Instruct-GGUF:Q8_0

# Python bindings
pip install llama-cpp-python
```

### Model Discovery

1. Search: `https://huggingface.co/models?apps=llama.cpp&sort=trending`
2. Open repo with `?local-app=llama.cpp` for recommended commands
3. Query tree API: `https://huggingface.co/api/models/<repo>/tree/main?recursive=true`

### Choosing a Quant

- `Q4_K_M` — general chat (default)
- `Q5_K_M` / `Q6_K` — code/technical work
- `Q3_K_M` / `IQ` — tight RAM budgets
- Check HF page for hardware-specific recommendations

### Python Example

```python
from llama_cpp import Llama

llm = Llama(model_path="./model.gguf", n_ctx=4096, n_gpu_layers=35)
out = llm("What is ML?", max_tokens=256, temperature=0.7)
print(out["choices"][0]["text"])
```

---

## 2. Production Serving (vLLM)

High-throughput LLM serving with OpenAI-compatible API.

### Quick Start

```bash
pip install vllm

# Start server
vllm serve meta-llama/Llama-3-8B-Instruct

# Query
curl http://localhost:8000/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"meta-llama/Llama-3-8B-Instruct","messages":[{"role":"user","content":"Hello!"}]}'
```

### Production Config

```bash
# Single GPU
vllm serve MODEL --gpu-memory-utilization 0.9 --max-model-len 8192

# Multi-GPU with quantization
vllm serve MODEL --tensor-parallel-size 4 --quantization awq

# With monitoring
vllm serve MODEL --enable-prefix-caching --enable-metrics --metrics-port 9090
```

### When to Use vLLM vs llama.cpp

| Use Case | Tool |
|----------|------|
| Production API (100+ req/sec) | vLLM |
| Single-user local inference | llama.cpp |
| CPU-only or Apple Silicon | llama.cpp |
| Multi-user chatbot | vLLM |
| Edge deployment | llama.cpp |

---

## 3. Benchmarking (lm-eval-harness)

Evaluate LLMs across 60+ academic benchmarks (MMLU, GSM8K, HumanEval).

### Quick Start

```bash
pip install lm-eval

# Standard benchmark suite
lm_eval --model hf \
  --model_args pretrained=meta-llama/Llama-2-7b-hf \
  --tasks mmlu,gsm8k,hellaswag,truthfulqa,arc_challenge \
  --num_fewshot 5 --batch_size 8

# Faster with vLLM backend
lm_eval --model vllm \
  --model_args pretrained=meta-llama/Llama-2-7b-hf,tensor_parallel_size=2 \
  --tasks mmlu --batch_size auto
```

### Key Benchmarks

- **MMLU** — 57-subject knowledge test
- **GSM8K** — grade school math
- **HumanEval** — Python code generation
- **HellaSwag** — common sense reasoning
- **TruthfulQA** — factuality

---

## 4. Model Discovery (HuggingFace Hub)

Find, download, and manage models from HuggingFace.

### Common Operations

```bash
# Search models
huggingface-cli search text-generation "llama 3"

# Download model
huggingface-cli download meta-llama/Llama-3-8B-Instruct

# List available GGUFs
curl -s https://huggingface.co/api/models/<repo>/tree/main?recursive=true | \
  jq '.[] | select(.path | endswith(".gguf")) | {path, size}'
```

### URL Patterns

- Browse: `https://huggingface.co/models?search=<term>&sort=trending`
- llama.cpp: `https://huggingface.co/models?apps=llama.cpp&sort=trending`
- Tree API: `https://huggingface.co/api/models/<repo>/tree/main?recursive=true`

---

## Hardware Requirements

| Model Size | VRAM (bf16) | VRAM (8-bit) | Tool |
|-----------|-------------|--------------|------|
| 7B-13B | 16-28GB | 8-14GB | llama.cpp or vLLM |
| 30B-40B | 60-80GB | 30-40GB | vLLM (2 GPU) |
| 70B+ | 140GB+ | 70GB+ | vLLM (4 GPU) + AWQ |

## Related Skills

- `segment-anything-model` — Image segmentation (SAM)
- `weights-and-biases` — Experiment tracking
- `huggingface-hub` — HuggingFace Hub CLI
