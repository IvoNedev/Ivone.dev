# Integration and compatibility notes

## Critical incompatibilities found

1. The pre-existing assistant posted prompts to the ASP.NET `/api/3d-animation/plan` route. That violates local-only inference. The editor integration now imports the browser package and invokes its worker instead.
2. The editor is a plain JavaScript Razor page, not a TypeScript/Vite application. Production assets are therefore emitted as a self-contained ES module and worker under `wwwroot/animation-parser`.
3. The editor's Three.js core, controls, and loader still come from a CDN. The parser is offline-cacheable, but the whole editor is not offline from a cold cache.
4. The renderer implemented only a subset of character clips. This integration adds simple `run` and `jump` procedural poses; imported GLTF clip binding remains future work.

## Scene conventions reused

- Right-handed coordinates, +Y up, -Z forward.
- Scene units and 0-ground plane.
- Existing action fields: `id`, `type`, `entityId`, `start`, `duration`.
- Existing action types: `place`, `moveTo`, `rotateBy`, `scaleTo`, `setColor`, `stand`, `duck`, `open`, `close`, `fallToGround`, `cameraFollow`, and `cameraLookAt`.
- Existing `setActionPlan` operation plus `addPrimitive`; integration-only `removeEntity`, `updateEntity`, and `setKeyframe` operations were added.

## Deployment

`npm run build` bundles and copies the exact production asset state to:

```text
Ivone.dev/wwwroot/animation-parser/
```

ASP.NET static-file serving handles the `.js`, `.mjs`, `.wasm`, `.onnx`, and JSON assets. If a reverse proxy is used, configure:

- `.wasm` → `application/wasm`
- `.onnx` → `application/octet-stream`
- `.mjs` → `text/javascript`

Serve over HTTPS (or localhost) for service-worker caching. Cross-origin isolation is optional; without it ONNX Runtime reduces WASM threading. The editor shows real runtime/model download progress, identifies cached loads, and offers entry to the editor after 12 seconds while initialization continues.

## Editable semantics

Change movement styles, default durations, directions, ground clearances, easing, or timeline limits in `semantic-defaults.json`. The model does not contain these product numbers.

## Security

- Prompts are processed in a dedicated worker.
- No prompt-network request is made.
- No generated text is evaluated as JavaScript.
- The neural model emits logits only, not code or JSON.
- JSON IR is validated and conservatively repaired before planner conversion.
- Unresolved entity references cause warnings and skipped operations.
- Model/runtime files are checksummed in `SHA256SUMS`.
