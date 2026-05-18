import { describe, expect, it } from 'vitest';
import { DIFF_MARKER, diffRuns, renderDiffMarkdown } from '../diff.js';
import type { EvalRunFile } from '../types.js';

function makeRun(overrides: Partial<EvalRunFile> = {}): EvalRunFile {
  return {
    agentkitEvalVersion: '0.0.1',
    runId: '01',
    evalName: 'rag',
    startedAt: '2026-01-01T00:00:00.000Z',
    finishedAt: '2026-01-01T00:00:01.000Z',
    cases: [],
    summary: {
      pass: 3,
      fail: 0,
      meanScores: { toolOrder: 1, latencyUnder: 0.95 },
      totalCostUsd: 0,
      p50LatencyMs: 5,
      p95LatencyMs: 10,
    },
    ...overrides,
  };
}

describe('diffRuns', () => {
  it('unions scorers from base and head', () => {
    const base = makeRun({
      summary: {
        pass: 2,
        fail: 1,
        meanScores: { toolOrder: 0.8, oldScorer: 1 },
        totalCostUsd: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
      },
    });
    const head = makeRun();
    const d = diffRuns(base, head);
    expect(d.scorers).toEqual(['latencyUnder', 'oldScorer', 'toolOrder']);
  });

  it('handles a missing base', () => {
    const d = diffRuns(null, makeRun());
    expect(d.base).toBeNull();
    expect(d.head.pass).toBe(3);
  });
});

describe('renderDiffMarkdown', () => {
  it('starts with the sticky marker', () => {
    const md = renderDiffMarkdown([diffRuns(makeRun(), makeRun())]);
    expect(md.startsWith(DIFF_MARKER)).toBe(true);
  });

  it('shows a delta against base mean scores', () => {
    const base = makeRun({
      summary: {
        pass: 2,
        fail: 1,
        meanScores: { toolOrder: 0.8 },
        totalCostUsd: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
      },
    });
    const head = makeRun({
      summary: {
        pass: 3,
        fail: 0,
        meanScores: { toolOrder: 1 },
        totalCostUsd: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
      },
    });
    const md = renderDiffMarkdown([diffRuns(base, head)]);
    expect(md).toContain('| toolOrder | 0.800 | 1.000 | +0.200 |');
    expect(md).toContain('- head: **3 / 0**');
    expect(md).toContain('- base: 2 / 1');
  });

  it('marks scorers that only exist on head as new', () => {
    const base = makeRun({
      summary: {
        pass: 0,
        fail: 0,
        meanScores: {},
        totalCostUsd: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
      },
    });
    const head = makeRun({
      summary: {
        pass: 1,
        fail: 0,
        meanScores: { brandNew: 1 },
        totalCostUsd: 0,
        p50LatencyMs: 0,
        p95LatencyMs: 0,
      },
    });
    const md = renderDiffMarkdown([diffRuns(base, head)]);
    expect(md).toContain('| brandNew | — | 1.000 | new |');
  });

  it('renders a placeholder when no diffs are passed', () => {
    const md = renderDiffMarkdown([]);
    expect(md).toContain('_No eval runs found._');
  });
});
