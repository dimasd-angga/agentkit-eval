---
title: Compare variants
description: Run the same eval across multiple configurations and render a matrix.
---

`agentkit-eval compare` runs every eval file once per variant and prints a side-by-side matrix. It's the fastest way to A/B a model swap, a prompt change, or a tool-set change.

## Mechanics

The CLI sets `process.env.AGENTKIT_VARIANT` before each run. Your agent function reads it and branches.

```ts
async function ragAgent(query: string) {
  const variant = process.env.AGENTKIT_VARIANT ?? 'default';
  const model = variant === 'cheap' ? 'small-model' : 'big-model';
  // ...
}
```

The variant name is your contract. The CLI does not interpret it.

## Run it

```sh
pnpm exec agentkit-eval compare --variants default,cheap evals/
```

Output:

```
## rag-tool-use

| variant | pass / fail | latencyUnder | toolOrder | toolsCalled |
| --- | --- | --- | --- | --- |
| default | 3 / 0 | 1.000 | 1.000 | 1.000 |
| cheap   | 2 / 1 | 1.000 | 0.833 | 1.000 |
```

Each variant's runs land in `.agentkit-eval/<eval-name>/<variant>/<run-id>.json`.

## Options

| Flag | Default | Description |
| --- | --- | --- |
| `--variants <a,b,c>` | required | Comma-separated variant names. |
| `--out <dir>` | `.agentkit-eval` | Output root. |
| `--report <path>` | none | Also write the markdown matrix to disk. |

## Use cases

- **Model swap:** `--variants gpt-4o,sonnet-4-5,gemini-2.0` with the agent picking the model from the variant.
- **Prompt change:** `--variants v1,v2,v3` pointing at three prompt files.
- **Tool change:** `--variants full-tools,no-search` to see how badly the agent degrades without a tool.

The matrix is what goes in the launch tweet. Keep it useful.
