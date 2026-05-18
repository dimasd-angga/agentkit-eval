---
title: Output scorers
description: Score the final answer string, numbers, or tokens.
---

Output scorers compare `run.output` against an expected value or constraint. They are here so you do not have to pull a second library — but the trace scorers are the real differentiator.

## `exact()`

Strict equality between `String(run.output)` and `String(case.expected)`. The case's `expected` field carries the target.

```ts
cases: [
  { name: 'hours', input: 'when do you open?', expected: '9 to 5' },
],
scorers: [exact()]
```

## `contains(needle)`

Case-sensitive substring match against `run.output`.

```ts
contains('30 days')
```

## `regex(pattern)`

```ts
regex(/\b9\s*to\s*5\b/i)
```

`pattern` is a `RegExp`. Pass flags directly on the literal.

## `llmJudge({ rubric, judge, passThreshold? })`

LLM-as-judge for fuzzy comparisons. The framework does not call any provider for you — you bring the judge.

```ts
llmJudge({
  rubric: 'Score 1.0 if the answer is factually correct, else 0.0.',
  judge: async ({ rubric, output, expected }) => {
    // call whichever provider you like, return { score, reason }
    return { score: 0.95, reason: 'matches expected' };
  },
  passThreshold: 0.7,
});
```

`expected` is forwarded from `case.expected` when present.

## `latencyUnder(ms)`

Passes if `run.latencyMs <= ms`. Score degrades linearly past the threshold.

```ts
latencyUnder(1500)
```

## `costUnder(usd)`

Passes if `(run.costUsd ?? 0) <= usd`.

```ts
costUnder(0.05)
```

Costs are whatever your agent function records. The framework does not estimate.

## Combining

Output scorers compose with each other and with trace scorers. A passing case is one where every scorer passes.

```ts
scorers: [
  toolOrder(['search', 'read']),
  contains('30 days'),
  latencyUnder(1500),
]
```
