# agentkit-eval

Type-safe evals for AI agents. Score traces, not just outputs. Run locally. Results commit to git.

```ts
import { defineEval } from '@agentkit-eval/core';
import { toolOrder, toolsCalled, contains } from '@agentkit-eval/scorers';

export const rag = defineEval({
  name: 'rag-tool-use',
  cases: [{ name: 'hours', input: 'when does the store open?' }],
  agent: myAgent,
  scorers: [
    toolsCalled(['search', 'read']),
    toolOrder(['search', 'read']),
    contains('9 to 5'),
  ],
});
```

```
$ agentkit-eval run

rag-tool-use
  ✓ hours
    • toolsCalled 1.000
    • toolOrder 1.000
    • contains 1.000

3/3 passed · p50 2ms · p95 4ms
  → .agentkit-eval/rag-tool-use/...json
```

## Why

Most eval frameworks treat an LLM call as a black box that returns text. That worked for prompt engineering. It does not work for agents.

An agent run is a *trace*: which tools got called, in what order, with what arguments, how many retries, whether the loop terminated. `agentkit-eval` scores the trace, not just the final output.

- `toolsCalled([...])` — required tool set
- `toolOrder([...])` — strict sequence (subsequence match)
- `noTool('delete')` — negative assertion
- `stepCountUnder(n)` — loop budget guard
- `noErrorSteps()` — clean trace

Output-side scorers (`exact`, `contains`, `regex`, `llmJudge`, `latencyUnder`, `costUnder`) are there too so you do not have to import a second library.

## Install

```
pnpm add -D @agentkit-eval/core @agentkit-eval/scorers @agentkit-eval/cli
```

Node 20+. ESM and CJS both work.

## Quickstart

```
npx agentkit-eval init
npx agentkit-eval run
```

`init` scaffolds `evals/opening-hours.eval.ts` with a fake tool-using agent so you can see the trace scorers fire without setting any API keys.

To plug in a real agent, return an `AgentRun` from your `agent` function:

```ts
type AgentRun = {
  input: TInput;
  output: TOutput;
  trace: TraceStep[];          // tool_call, tool_result, text, error
  latencyMs: number;
  tokens?: { prompt: number; completion: number };
  costUsd?: number;
};
```

The Vercel AI SDK, OpenAI tool-calling, Anthropic tool-use, and Mastra all expose the data you need to build this. A `fromAISDK()` helper is on the roadmap.

## Results as git artifacts

Every run writes a JSON file to `.agentkit-eval/<eval-name>/<run-id>.json`. Commit the directory and PRs show real diffs:

```
- meanScores.toolOrder: 1.000
+ meanScores.toolOrder: 0.667
```

`--report REPORT.md` also writes a markdown summary suitable for sticking in a repo or pasting into a PR.

## CI

```yaml
- run: pnpm install
- run: pnpm agentkit-eval run --report REPORT.md
- if: failure()
  run: cat REPORT.md
```

Non-zero exit on any failing case. A GitHub Action that diffs the report against the base branch is shipping next.

## Status

Pre-1.0. The result file shape is stable. The scorer API may add fields, not remove them.

## License

MIT.
