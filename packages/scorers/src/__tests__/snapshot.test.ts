import { mkdtempSync, rmSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import type { AgentRun } from '@agentkit-eval/core';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { toMatchSnapshot } from '../snapshot.js';

function makeRun(output: string, input = 'q'): AgentRun<string, string> {
  return { input, output, trace: [], latencyMs: 1 };
}

let dir = '';

beforeEach(() => {
  dir = mkdtempSync(join(tmpdir(), 'agentkit-snap-'));
  delete process.env.AGENTKIT_UPDATE_SNAPSHOTS;
});

afterEach(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe('toMatchSnapshot exact mode', () => {
  it('writes a new snapshot on first run and passes', async () => {
    const scorer = toMatchSnapshot({ dir, name: 's' });
    const r = await scorer.score({ run: makeRun('hello world') });
    expect(r.passed).toBe(true);
    expect(r.reason).toBe('written (new)');
  });

  it('passes on a matching second run', async () => {
    const scorer = toMatchSnapshot({ dir, name: 's' });
    await scorer.score({ run: makeRun('hello world') });
    const r = await scorer.score({ run: makeRun('hello world') });
    expect(r.passed).toBe(true);
    expect(r.reason).toBeUndefined();
  });

  it('fails when the output drifts from snapshot', async () => {
    const scorer = toMatchSnapshot({ dir, name: 's' });
    await scorer.score({ run: makeRun('hello world') });
    const r = await scorer.score({ run: makeRun('hello mars') });
    expect(r.passed).toBe(false);
    expect(r.score).toBe(0);
  });

  it('updates the snapshot when AGENTKIT_UPDATE_SNAPSHOTS=1', async () => {
    const scorer = toMatchSnapshot({ dir, name: 's' });
    await scorer.score({ run: makeRun('first') });
    process.env.AGENTKIT_UPDATE_SNAPSHOTS = '1';
    await scorer.score({ run: makeRun('second') });
    const files = await readFile(join(dir, 's.q.snap.md'), 'utf8');
    expect(files).toBe('second');
  });
});

describe('toMatchSnapshot semantic mode', () => {
  it('passes when token overlap exceeds threshold', async () => {
    const scorer = toMatchSnapshot({ dir, name: 's', mode: 'semantic', passThreshold: 0.5 });
    await scorer.score({ run: makeRun('the store opens at nine') });
    const r = await scorer.score({ run: makeRun('the store opens at ten') });
    expect(r.passed).toBe(true);
  });

  it('fails when token overlap is too low', async () => {
    const scorer = toMatchSnapshot({ dir, name: 's', mode: 'semantic', passThreshold: 0.9 });
    await scorer.score({ run: makeRun('apples bananas cherries') });
    const r = await scorer.score({ run: makeRun('something completely different here') });
    expect(r.passed).toBe(false);
  });
});

describe('toMatchSnapshot llm-judge mode', () => {
  it('uses the judge verdict', async () => {
    const scorer = toMatchSnapshot({
      dir,
      name: 's',
      mode: 'llm-judge',
      judge: async () => ({ score: 0.95, reason: 'close enough' }),
      passThreshold: 0.85,
    });
    await scorer.score({ run: makeRun('original') });
    const r = await scorer.score({ run: makeRun('rewritten') });
    expect(r.passed).toBe(true);
    expect(r.reason).toBe('close enough');
  });

  it('throws if judge is missing', () => {
    expect(() => toMatchSnapshot({ dir, mode: 'llm-judge' })).toThrowError(/judge/);
  });
});
