import type { AgentRun } from '@agentkit-eval/core';
import { describe, expect, it } from 'vitest';
import {
  contains,
  costUnder,
  exact,
  latencyUnder,
  llmJudge,
  regex,
} from '../output.js';

function make<O>(output: O, opts: Partial<AgentRun<string, O>> = {}): AgentRun<string, O> {
  return { input: 'q', output, trace: [], latencyMs: 10, ...opts };
}

describe('exact', () => {
  it('passes when output equals expected', () => {
    const r = exact<string, string>().score({ run: make('hello'), expected: 'hello' });
    expect(r.passed).toBe(true);
  });

  it('fails otherwise', () => {
    const r = exact<string, string>().score({ run: make('hello'), expected: 'world' });
    expect(r.passed).toBe(false);
  });
});

describe('contains', () => {
  it('passes when substring is present', () => {
    expect(contains('9 to 5').score({ run: make('open 9 to 5 daily') }).passed).toBe(true);
  });
  it('fails when substring is absent', () => {
    expect(contains('closed').score({ run: make('open 9 to 5 daily') }).passed).toBe(false);
  });
});

describe('regex', () => {
  it('matches', () => {
    expect(regex(/\d+\s*to\s*\d+/).score({ run: make('9 to 5') }).passed).toBe(true);
  });
  it('does not match', () => {
    expect(regex(/never/).score({ run: make('9 to 5') }).passed).toBe(false);
  });
});

describe('latencyUnder', () => {
  it('passes within budget', () => {
    expect(latencyUnder(100).score({ run: make('ok', { latencyMs: 50 }) }).passed).toBe(true);
  });
  it('fails over budget', () => {
    expect(latencyUnder(10).score({ run: make('ok', { latencyMs: 50 }) }).passed).toBe(false);
  });
});

describe('costUnder', () => {
  it('passes within budget', () => {
    expect(costUnder(1).score({ run: make('ok', { costUsd: 0.5 }) }).passed).toBe(true);
  });
  it('fails over budget', () => {
    expect(costUnder(0.1).score({ run: make('ok', { costUsd: 0.5 }) }).passed).toBe(false);
  });
});

describe('llmJudge', () => {
  it('passes when judge score meets the threshold', async () => {
    const r = await llmJudge({
      rubric: 'is it polite',
      judge: async () => ({ score: 0.9, reason: 'polite enough' }),
    }).score({ run: make('hello there') });
    expect(r.passed).toBe(true);
  });

  it('fails when judge score is below the threshold', async () => {
    const r = await llmJudge({
      rubric: 'is it polite',
      judge: async () => ({ score: 0.3 }),
      passThreshold: 0.8,
    }).score({ run: make('hey') });
    expect(r.passed).toBe(false);
  });

  it('clamps scores into 0..1', async () => {
    const r = await llmJudge({
      rubric: 'r',
      judge: async () => ({ score: 5 }),
    }).score({ run: make('x') });
    expect(r.score).toBe(1);
  });
});
