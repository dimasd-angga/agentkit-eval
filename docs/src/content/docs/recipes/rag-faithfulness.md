---
title: RAG faithfulness
description: Check that the model actually grounds answers in retrieved documents.
---

A RAG agent that ignores its retrieval is worse than one that doesn't retrieve at all. This recipe combines a tool-order assertion with an LLM-judged faithfulness check.

```ts
import { defineEval } from '@agentkit-eval/core';
import { toolOrder, llmJudge } from '@agentkit-eval/scorers';

export default defineEval({
  name: 'rag-faithfulness',
  cases: [
    {
      name: 'returns-policy',
      input: 'How long do I have to return something?',
      expected: 'Returns are accepted within 30 days with a receipt.',
    },
  ],
  agent: ragAgent,
  scorers: [
    toolOrder(['search', 'read']),
    llmJudge({
      rubric:
        'Score 1.0 if the output is directly supported by the expected document, ' +
        '0.5 if partially supported, 0.0 if it contradicts or invents facts.',
      judge: async ({ rubric, output, expected }) => {
        // call any provider, return { score, reason }
        return { score: 0.9, reason: 'matches policy text' };
      },
      passThreshold: 0.7,
    }),
  ],
});
```

The `toolOrder` scorer guarantees the agent actually retrieved before answering. The `llmJudge` scorer checks the answer is faithful to what it retrieved. You need both — either alone is gameable.
