# Dependency and license report

Production direct dependencies:

| Package | Pinned version | License | Purpose |
|---|---:|---|---|
| `onnxruntime-web` | 1.27.0 | MIT | Browser WebGPU/WASM inference |
| `ajv` | 8.20.0 | MIT | JSON Schema validation |

Build/test direct dependencies:

| Package | Pinned version | License | Purpose |
|---|---:|---|---|
| `typescript` | 5.8.3 | Apache-2.0 | Type checking |
| `esbuild` | 0.25.8 | MIT | Browser/node bundles |
| `vitest` | 3.2.4 | MIT | Unit/regression tests |
| `@playwright/test` | 1.54.1 | Apache-2.0 | Real-browser worker test |
| `onnx-proto` | 8.0.1 | MIT | Reproducible ONNX protobuf emission |
| `@types/node` | 24.1.0 | MIT | Script typings |

The dependency tree and exact integrity hashes are pinned by `package-lock.json`. Run `npm audit --omit=dev` for the production dependency audit. `onnx-proto` is build-only and brings an older protobuf implementation; it is never bundled into or executed by the production parser.
