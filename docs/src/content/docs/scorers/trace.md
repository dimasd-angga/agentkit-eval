---
title: Trace scorers
description: Score what the agent did, not just what it returned.
---

Trace scorers inspect the `trace: TraceStep[]` your agent returns. Each step has a `type` (`tool_call`, `tool_result`, `text`, or `error`) and optional `name`, `args`, `result`.

```ts
type TraceStep = {
  type: 'tool_call' | 'tool_result' | 'text' | 'error';
  name?: string;
  args?: unknown;
  result?: unknown;
  latencyMs?: number;
};
```

## `toolsCalled(required)`

Passes if every tool in `required` appears at least once in the trace.

```ts
toolsCalled(['search', 'read'])
```

Score is the fraction of required tools that appeared. Two of three present → `0.667`.

## `toolOrder(sequence)`

Passes if `sequence` appears as a **subsequence** of tool calls in the trace. Other tools between the required ones are fine.

```ts
toolOrder(['search', 'read', 'respond'])
```

Catches a class of failures where the model invents an answer before consulting its tools.

## `noTool(name)`

Negative assertion. Passes if the named tool was never called.

```ts
noTool('delete')
```

Use this to guard against destructive tools in eval runs.

## `stepCountUnder(n)`

Passes if the total number of `tool_call` + `text` steps is under `n`. Catches runaway loops.

```ts
stepCountUnder(8)
```

## `noErrorSteps()`

Passes if no step has `type: 'error'`.

## How they compose

Scorers are independent. One can fail without affecting another. The case-level `passed` is the AND of all of them.

```ts
defineEval({
  name: 'rag',
  cases: [...],
  agent: ragAgent,
  scorers: [
    toolsCalled(['search', 'read']),
    toolOrder(['search', 'read']),
    noTool('delete'),
    stepCountUnder(10),
  ],
});
```

## Writing your own

A scorer is a `{ name, score }` pair. The score function gets the run and returns a `ScorerResult`.

```ts
import type { Scorer } from '@agentkit-eval/core';

export function toolCalledExactlyOnce(name: string): Scorer<unknown, unknown> {
  return {
    name: `toolCalledExactlyOnce:${name}`,
    score: ({ run }) => {
      const count = run.trace.filter(
        (s) => s.type === 'tool_call' && s.name === name,
      ).length;
      const passed = count === 1;
      return {
        name: `toolCalledExactlyOnce:${name}`,
        score: passed ? 1 : 0,
        passed,
        reason: passed ? undefined : `called ${count} times`,
      };
    },
  };
}
```

Custom scorers compose with the built-ins. The type parameters flow from `defineEval` into the scorer body — `run.input` and `run.output` are typed without casts.
