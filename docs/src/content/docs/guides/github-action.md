---
title: GitHub Action
description: Sticky PR comments with score deltas against the base branch.
---

The action runs your evals on the PR head, runs the same evals on the base ref, then posts a sticky comment with the per-scorer delta. If you change a prompt and your `toolOrder` score drops, you see it in the PR before review.

## Setup

```yaml
# .github/workflows/eval.yml
name: eval
on: pull_request

permissions:
  contents: read
  pull-requests: write

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0       # required to check out the base ref
      - uses: pnpm/action-setup@v4
        with: { version: 9 }
      - uses: actions/setup-node@v4
        with: { node-version: 20, cache: pnpm }
      - uses: dimasd-angga/agentkit-eval/packages/action@main
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

The action checks out the base ref into a git worktree, runs evals there, and diffs the two JSON output directories.

## Inputs

| Name | Default | |
| --- | --- | --- |
| `eval-glob` | `**/*.eval.ts` | Passed to `agentkit-eval run`. |
| `base-ref` | PR base, fallback `origin/main` | Git ref to compare against. |
| `working-directory` | `.` | Where to run the eval command. |
| `install-command` | `pnpm install --frozen-lockfile` | |
| `run-command` | `pnpm exec agentkit-eval run --out "$AGENTKIT_OUT"` | Action sets `AGENTKIT_OUT`. |
| `comment` | `true` | `false` skips the PR comment; the artifact is always uploaded. |
| `github-token` | `${{ github.token }}` | Used to post the comment. |

## What the comment looks like

```
<!-- agentkit-eval:diff -->
# Eval report

## rag-tool-use

- head: **3 / 0** (pass / fail)
- base: 2 / 1

| scorer | base | head | Δ |
| --- | --- | --- | --- |
| latencyUnder | 1.000 | 1.000 | · |
| toolOrder | 0.667 | 1.000 | +0.333 |
| toolsCalled | 1.000 | 1.000 | · |
```

The leading marker is how the action finds and updates the existing comment on subsequent runs. Don't strip it.

## Running diff locally

The same command the action runs:

```sh
agentkit-eval run --out .agentkit-eval-head
git worktree add /tmp/base origin/main
( cd /tmp/base && pnpm install && pnpm exec agentkit-eval run --out /tmp/agentkit-base )
agentkit-eval diff /tmp/agentkit-base .agentkit-eval-head
```

Useful when CI is red and you want to reproduce.

## Failure modes

- **First PR on `main`:** the base ref has no eval results. The diff renders with `base: —` and every scorer marked `new`. Expected.
- **Eval flake on base:** the comment shows a delta that isn't a real regression. Re-run the job; the comment updates in place.
- **Provider rate limits:** the action runs evals twice. Cache responses or use a cheaper model in CI.
