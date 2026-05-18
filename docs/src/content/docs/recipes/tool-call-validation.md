---
title: Tool-call validation
description: Catch agents that skip required tools or call them out of order.
---

A common failure mode: the model invents an answer instead of calling a tool, or calls them in the wrong order. Two scorers cover most of this.

```ts
import { defineEval } from '@agentkit-eval/core';
import { toolOrder, toolsCalled, noTool } from '@agentkit-eval/scorers';

export default defineEval({
  name: 'support-bot',
  cases: [
    { name: 'refund', input: 'I want a refund' },
    { name: 'hours', input: 'what time do you open?' },
  ],
  agent: supportAgent,
  scorers: [
    toolsCalled(['lookup_policy']),       // must consult policy
    toolOrder(['lookup_policy', 'reply']), // policy first, then reply
    noTool('issue_refund'),                // dry run; refunds happen in prod only
  ],
});
```

`toolOrder` uses subsequence matching, so other tool calls between `lookup_policy` and `reply` are fine. Only the relative order matters.
