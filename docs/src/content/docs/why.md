---
title: Why agentkit-eval
description: What this framework does that prompt-eval tools don't.
---

Most eval frameworks treat an LLM call as a black box that returns text. That worked when the LLM call *was* the system. It does not work for agents.

An agent run is a **trace**: which tools got called, in what order, with what arguments, how many retries, whether the loop terminated, how long each step took. The final string is one slice of that. Often it is the least interesting slice.

`agentkit-eval` is built around the trace.

## The differentiator in one example

A RAG agent that should always `search` before it `read`s a document. Here is the assertion in this library:

```ts
import { toolOrder } from '@agentkit-eval/scorers';

scorers: [toolOrder(['search', 'read'])],
```

Here is the equivalent in a string-eval framework:

```ts
// Implement it yourself. Parse the trace. Pray your agent runtime exposes one.
```

That gap — multiplied across `toolsCalled`, `noTool`, `stepCountUnder`, `noErrorSteps`, snapshot scoring on tool args — is the product.

## What about prompts?

The output-side scorers are still there: `exact`, `contains`, `regex`, `llmJudge`, `latencyUnder`, `costUnder`. Use both. A passing agent is one whose **trace** is well-shaped *and* whose **output** is correct.

## Comparison

| | Prompt evals (evalite, Promptfoo) | SaaS observability (Braintrust, Langfuse) | agentkit-eval |
| --- | --- | --- | --- |
| Trace-aware scoring | DIY | Some, varies | Built in |
| Type inference into scorers | Partial | No | Full |
| Local-first, no signup | Yes | No | Yes |
| Results live in git | No | No | Yes |
| Framework lock-in | None | Some | None — bring any agent |

## Status

Pre-1.0. The result file shape is stable. Scorer APIs may add fields, not remove them.
