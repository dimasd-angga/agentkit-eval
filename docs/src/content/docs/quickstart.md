---
title: Quickstart
description: Run your first eval in under five minutes.
---

You need Node 20+ and a package manager. The examples use pnpm.

## Install

```sh
pnpm add -D @agentkit-eval/core @agentkit-eval/scorers @agentkit-eval/cli
```

## Scaffold

```sh
pnpm exec agentkit-eval init
```

This writes `evals/opening-hours.eval.ts` with a fake tool-using agent. No API keys needed.

## Run

```sh
pnpm exec agentkit-eval run
```

```
opening-hours
  ✓ open question
    • toolsCalled 1.000
    • toolOrder 1.000
    • contains 1.000

1/1 passed · p50 0ms · p95 0ms
  → .agentkit-eval/opening-hours/<run-id>.json
```

## Plug in a real agent

The framework does not run your agent. You do. Return an `AgentRun` and `agentkit-eval` scores it.

```ts
import { defineEval, type AgentRun, type TraceStep } from '@agentkit-eval/core';
import { toolOrder, toolsCalled, contains } from '@agentkit-eval/scorers';

async function myAgent(query: string): Promise<AgentRun<string, string>> {
  const trace: TraceStep[] = [];
  // call your agent runtime here, push trace steps as it works
  return {
    input: query,
    output: 'we open at 9',
    trace,
    latencyMs: 42,
  };
}

export default defineEval({
  name: 'opening-hours',
  cases: [{ name: 'hours', input: 'when do you open?' }],
  agent: myAgent,
  scorers: [
    toolsCalled(['search']),
    toolOrder(['search']),
    contains('9'),
  ],
});
```

That's it. `agentkit-eval run` exits non-zero on any failing case, so it slots into CI like a test suite.

## Next

- [Trace scorers](/scorers/trace/) — the differentiator.
- [Compare variants](/guides/compare/) — A/B two configurations side by side.
- [GitHub Action](/guides/github-action/) — sticky PR comments with score deltas.
