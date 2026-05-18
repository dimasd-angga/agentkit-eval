---
title: Multi-step agent trajectory
description: Score loop budget and clean termination on multi-step agents.
---

When an agent loops, two things go wrong: it runs too long, or it errors out mid-trajectory. These scorers guard both.

```ts
import { defineEval } from '@agentkit-eval/core';
import { stepCountUnder, noErrorSteps, latencyUnder } from '@agentkit-eval/scorers';

export default defineEval({
  name: 'planner',
  cases: [
    { name: 'simple', input: 'Book me a flight from SFO to JFK on June 1' },
    { name: 'ambiguous', input: 'Plan a trip to Europe' },
  ],
  agent: plannerAgent,
  scorers: [
    stepCountUnder(15),     // hard loop budget
    noErrorSteps(),         // trace must not contain `{ type: 'error' }`
    latencyUnder(30_000),   // 30s wall clock
  ],
});
```

`stepCountUnder` counts `tool_call` and `text` steps. Tool results don't count — they're bookkeeping, not work.

If `stepCountUnder` keeps failing on an "ambiguous" case, the answer is usually not "raise the budget" — it's to add a clarification tool to your agent.
