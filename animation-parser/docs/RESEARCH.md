# Architecture research record

Research was checked against primary papers and official runtime documentation on 24 July 2026.

## Candidates

| Candidate | Strength | Cost/risk | Decision |
|---|---|---|---|
| Deterministic grammar only | Tiny, exact, transparent | Weak paraphrase robustness | Retained as authoritative parser, augmented by classifier |
| Linear encoder/intent classifier | ~5 KB model, deterministic, fast | No token-level generation | Selected after held-out evaluation |
| Compact BERT joint intent/slot encoder | Strong learned slots | Tens of MB plus tokenizer and more latency | Reproducible upgrade path if natural-corpus evaluation requires it |
| Small encoder-decoder/LLM | Flexible JSON generation | Larger download, schema/reference hallucination risk | Rejected for current closed ontology |

The task framing follows joint intent classification and slot filling research: https://arxiv.org/abs/1902.10909.

Runtime selection follows official ONNX Runtime Web support for WebGPU and WASM: https://onnxruntime.ai/docs/tutorials/web/. ONNX Runtime notes that WASM can be preferable for very lightweight models: https://onnxruntime.ai/docs/tutorials/web/ep-webgpu.html. The QDQ INT8 representation follows the official quantization documentation: https://onnxruntime.ai/docs/performance/model-optimizations/quantization.html.

## Upgrade gate

Do not replace the linear classifier with a transformer based on intuition. Require a held-out natural/adversarial set showing a statistically meaningful improvement in intent exact match or slot F1, with browser p95 latency and compressed download inside the documented budget.
