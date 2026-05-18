---
title: Snapshots
description: Lock the shape of an agent's output across runs.
---

`toMatchSnapshot()` compares the agent's output against a stored file. First run writes the file. Subsequent runs compare. Three modes.

## Modes

### `exact` (default)

Byte-for-byte equality. Best for deterministic outputs — JSON tool args, structured responses, anything you fully control.

```ts
import { toMatchSnapshot } from '@agentkit-eval/scorers';

scorers: [toMatchSnapshot({ name: 'rag' })]
```

### `semantic`

Jaccard token overlap between snapshot and output. No model calls. Cheap and flake-resistant when wording drifts but meaning holds.

```ts
toMatchSnapshot({ name: 'rag', mode: 'semantic', passThreshold: 0.7 })
```

### `llm-judge`

You provide a judge function. The snapshot is treated as the reference; the judge decides whether the new output passes.

```ts
toMatchSnapshot({
  name: 'rag',
  mode: 'llm-judge',
  passThreshold: 0.85,
  judge: async ({ actual, expected }) => {
    // call any provider, return { score: 0..1, reason? }
    return { score: 0.92, reason: 'same meaning' };
  },
})
```

## Where snapshots live

By default: `.agentkit-eval/__snapshots__/<name>.<caseKey>.snap.md`. Commit them. The `.snap.md` extension keeps GitHub diffs readable.

Override the directory:

```ts
toMatchSnapshot({ dir: 'tests/__snapshots__', name: 'rag' })
```

## Updating

```sh
AGENTKIT_UPDATE_SNAPSHOTS=1 pnpm exec agentkit-eval run
```

Every snapshot gets rewritten on the next run. Review the diff before committing.

## When to use which mode

| Output shape | Mode |
| --- | --- |
| Structured (JSON, tool args) | `exact` |
| Prose, model-generated | `semantic` if cheap drift is OK; `llm-judge` if you need a verdict |
| High-stakes (legal, safety) | `llm-judge` with a strong judge |

The default is `exact` because exact failures are easy to investigate. Move to `semantic` when you actually see flakes.
