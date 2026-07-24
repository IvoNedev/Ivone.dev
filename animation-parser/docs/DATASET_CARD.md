# Dataset card: Ivone Animation IR 1.0

## Summary

7,814 English animation-authoring examples generated from an explicit, original ontology, plus manually-authored adversarial examples. The dataset covers creation/removal, transforms, appearance, timing, sequencing/parallelism, clips, camera actions, interactions, falling, keyframes, repetitions, 180 explicit prompt-revision pairs, typos, colloquialisms, unsupported commands, ambiguity, and no-op examples.

## Files and splits

Counts are recorded in `dataset/manifest.json`. A SHA-256 hash of `templateFamily` assigns a complete family to train, validation, or held-out test. A paraphrase/template family cannot cross split boundaries.

## Provenance

- Grammar-generated text written specifically for this repository.
- Manually-authored adversarial and natural examples written specifically for this repository.
- No external datasets, scraped text, copyrighted corpora, or model-generated third-party content.

## License

CC0-1.0. See `DATASET-LICENSE`.

## Regeneration

```powershell
npm ci
npm run generate:data
```

Generation is deterministic; the manifest intentionally uses no wall-clock timestamp.

## Known biases and limitations

The data is English-centric, synthetic examples are cleaner and more ontology-balanced than real user traffic, and proper-name variety is intentionally small. Production telemetry must not be collected without an explicit privacy design and consent.
