import { describe, expect, it } from 'vitest';
import { defineEval } from '../defineEval.js';
import { runEval } from '../runner.js';
import type { Scorer } from '../types.js';

const alwaysPass: Scorer<string, string> = {
  name: 'alwaysPass',
  score: () => ({ name: 'alwaysPass', score: 1, passed: true }),
};

const alwaysFail: Scorer<string, string> = {
  name: 'alwaysFail',
  score: () => ({ name: 'alwaysFail', score: 0, passed: false }),
};

describe('runEval', () => {
  it('runs each case and aggregates scores', async () => {
    const def = defineEval({
      name: 'happy',
      cases: [
        { name: 'a', input: 'hi' },
        { name: 'b', input: 'hey' },
      ],
      agent: (input) => ({ input, output: input.toUpperCase(), trace: [], latencyMs: 1 }),
      scorers: [alwaysPass],
    });

    const run = await runEval(def);
    expect(run.summary.pass).toBe(2);
    expect(run.summary.fail).toBe(0);
    expect(run.summary.meanScores.alwaysPass).toBe(1);
    expect(run.cases.every((c) => c.passed)).toBe(true);
  });

  it('marks cases failed when a scorer fails', async () => {
    const def = defineEval({
      name: 'mixed',
      cases: [{ name: 'a', input: 'hi' }],
      agent: (input) => ({ input, output: input, trace: [], latencyMs: 1 }),
      scorers: [alwaysPass, alwaysFail],
    });

    const run = await runEval(def);
    expect(run.summary.pass).toBe(0);
    expect(run.summary.fail).toBe(1);
  });

  it('captures agent errors without crashing the run', async () => {
    const def = defineEval<string, string>({
      name: 'throws',
      cases: [{ name: 'boom', input: 'x' }],
      agent: () => {
        throw new Error('agent blew up');
      },
      scorers: [alwaysPass],
    });

    const run = await runEval(def);
    expect(run.cases[0]?.error?.message).toBe('agent blew up');
    expect(run.cases[0]?.passed).toBe(false);
  });

  it('resolves cases from an async factory', async () => {
    const def = defineEval({
      name: 'lazy',
      cases: async () => [{ name: 'a', input: 'hi' }],
      agent: (input) => ({ input, output: input, trace: [], latencyMs: 1 }),
      scorers: [alwaysPass],
    });

    const run = await runEval(def);
    expect(run.cases).toHaveLength(1);
  });
});
