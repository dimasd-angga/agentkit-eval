# agentkit-eval GitHub Action

Runs `agentkit-eval` on a pull request, runs the same evals on the base ref, and posts a sticky PR comment with the score diff.

## Usage

```yaml
# .github/workflows/eval.yml
name: eval
on:
  pull_request:
    paths:
      - 'src/**'
      - 'evals/**'

permissions:
  contents: read
  pull-requests: write

jobs:
  eval:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          fetch-depth: 0
      - uses: pnpm/action-setup@v4
        with:
          version: 9
      - uses: actions/setup-node@v4
        with:
          node-version: 20
          cache: pnpm
      - uses: dimasd-angga/agentkit-eval/packages/action@main
        env:
          OPENAI_API_KEY: ${{ secrets.OPENAI_API_KEY }}
```

## Inputs

| Name | Default | Description |
| --- | --- | --- |
| `eval-glob` | `**/*.eval.ts` | Passed through to `agentkit-eval run`. |
| `base-ref` | PR base, falling back to `origin/main` | Git ref to compare against. |
| `working-directory` | `.` | Directory where evals live. |
| `install-command` | `pnpm install --frozen-lockfile` | How to install deps. |
| `run-command` | `pnpm exec agentkit-eval run --out "$AGENTKIT_OUT"` | How to run evals. The action sets `AGENTKIT_OUT`. |
| `comment` | `true` | Set to `false` to skip the PR comment and only upload the report artifact. |
| `github-token` | `${{ github.token }}` | Token used to post the sticky comment. |

The action always uploads `agentkit-eval-report.md` as a workflow artifact, regardless of `comment`.

## Notes

- The action runs evals twice — once on the PR head and once on the base. The base run uses `git worktree add` so the head's `node_modules` is not touched.
- The PR comment is identified by the marker `<!-- agentkit-eval:diff -->`. The action updates the existing comment if found, otherwise creates a new one.
- If the base ref cannot be checked out (first PR on `main`, base deleted, etc.) the diff is rendered with `base: —` and every scorer marked `new`.
