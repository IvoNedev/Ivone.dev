# Ivone browser animation parser

A deterministic, local-only natural-language animation parser for the Ivone 3D editor. It produces versioned JSON IR, resolves the IR through editable product semantics, and adapts the result to the editor's existing canonical planner actions.

## Integration

The repository build copies production assets to `Ivone.dev/wwwroot/animation-parser`. The existing `3d-animation.js` integration lazy-loads that module and never sends prompt text to `/api/3d-animation/plan`.

```js
import {
  BrowserAnimationParser,
  PlannerAnimationParser
} from "/animation-parser/index.js";

const animationParser = new PlannerAnimationParser(
  new BrowserAnimationParser({ baseUrl: "/animation-parser/" })
);

await animationParser.initialize();
const patch = await animationParser.parseToPlanner({
  previousPrompt,
  currentPrompt,
  scene,
  selectedEntityId,
  actionCatalog
});
```

The lower-level API returns IR directly:

```js
const result = await animationParser.parser.parse({
  previousPrompt,
  currentPrompt,
  scene,
  selectedEntityId,
  actionCatalog
});
```

Available lifecycle methods are `initialize()`, `getLoadProgress()`, `parse()`, `dispose()`, `getModelVersion()`, and `isWebGPUSupported()`.

## Clean-checkout verification

Run from `animation-parser`:

```powershell
npm ci
npm run generate:data
npm run train
npm run typecheck
npm run build
npm test
npm run evaluate
npm run test:browser
npm run checksums
```

The five-command condensed verification requested for handoff is:

```powershell
cd animation-parser
npm ci
npx playwright install chromium
npm run verify:clean
npm audit --omit=dev
```

`npm run test:browser` additionally requires a Playwright Chromium installation (`npx playwright install chromium`).

## Artifact layout

- `models/intent-classifier.int8.onnx`: trained 5 KB INT8 QDQ intent classifier.
- `models/tokenizer.json`: deterministic hashed feature configuration.
- `schema/animation-ir.schema.json`: JSON Schema 2020-12 IR contract.
- `src/`: TypeScript parser, resolver, validation, runtime, worker, and adapter.
- `dataset/`: 7,814 legally distributable examples with leakage-safe splits.
- `scripts/`: deterministic data, training, build, evaluation, and checksum pipeline.
- `demo/`: interactive local parser page.
- `reports/`: executed evaluation output.
- `dist/browser/`: ready-to-serve worker/runtime/model/WASM files.

## Runtime behavior

The worker uses ONNX Runtime Web's WASM execution provider. For this 5 KB linear classifier, WASM avoids shipping the much larger WebGPU/JSEP runtime and has negligible inference cost. The first load downloads roughly 13.5 MB of runtime files with byte-level progress; the worker caches them for later visits. The neural model only supplies intent evidence; deterministic code owns entity matching, temporal structure, validation, safe repair, and planner conversion. Unresolved references are warned and skipped, never invented.

Product-specific numbers live in `semantic-defaults.json` and `src/config.ts`. Keep these synchronized or load the JSON into a custom `PlannerAnimationParser` configuration.

## Compatibility

| Component | Status | Notes |
|---|---|---|
| Current Chromium/Edge | Supported | Local WASM inference |
| Current Firefox/Safari | Supported | Local WASM inference |
| Offline parser after first cache | Supported | Runtime and model are cached on demand |
| Existing ASP.NET Core editor | Integrated | Lazy browser import; no prompt API request |
| Existing canonical planner actions | Supported | `moveTo`, `rotateBy`, `scaleTo`, `setColor`, clips, camera, door, fall |
| Whole editor offline | Not yet | The editor still loads Three.js controls/loaders from jsDelivr |

See [INTEGRATION.md](docs/INTEGRATION.md), [MODEL_CARD.md](docs/MODEL_CARD.md), and [DATASET_CARD.md](docs/DATASET_CARD.md).
