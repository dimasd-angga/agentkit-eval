import type { AgentRun, TraceStep } from '@agentkit-eval/core';
import { describe, expect, it } from 'vitest';
import {
  noErrorSteps,
  noTool,
  stepCountUnder,
  toolOrder,
  toolsCalled,
} from '../trace.js';

function run(trace: TraceStep[]): AgentRun<string, string> {
  return { input: 'q', output: 'a', trace, latencyMs: 1 };
}

const search: TraceStep = { type: 'tool_call', name: 'search' };
const read: TraceStep = { type: 'tool_call', name: 'read' };
const del: TraceStep = { type: 'tool_call', name: 'delete' };
const err: TraceStep = { type: 'error' };

describe('toolsCalled', () => {
  it('passes when all required tools were called', () => {
    const r = toolsCalled(['search', 'read']).score({ run: run([search, read]) });
    expect(r.passed).toBe(true);
    expect(r.score).toBe(1);
  });

  it('fails and reports missing tools', () => {
    const r = toolsCalled(['search', 'read']).score({ run: run([search]) });
    expect(r.passed).toBe(false);
    expect(r.reason).toContain('read');
  });
});

describe('toolOrder', () => {
  it('matches as a subsequence', () => {
    const r = toolOrder(['search', 'read']).score({
      run: run([search, { type: 'text' }, read]),
    });
    expect(r.passed).toBe(true);
  });

  it('fails when order is wrong', () => {
    const r = toolOrder(['search', 'read']).score({ run: run([read, search]) });
    expect(r.passed).toBe(false);
  });
});

describe('noTool', () => {
  it('passes when forbidden tool is absent', () => {
    expect(noTool('delete').score({ run: run([search, read]) }).passed).toBe(true);
  });

  it('fails when forbidden tool was called', () => {
    expect(noTool('delete').score({ run: run([search, del]) }).passed).toBe(false);
  });
});

describe('stepCountUnder', () => {
  it('passes when trace is short enough', () => {
    expect(stepCountUnder(5).score({ run: run([search, read]) }).passed).toBe(true);
  });

  it('fails when trace exceeds the budget', () => {
    expect(stepCountUnder(2).score({ run: run([search, read, search]) }).passed).toBe(false);
  });
});

describe('noErrorSteps', () => {
  it('passes when no error steps', () => {
    expect(noErrorSteps().score({ run: run([search]) }).passed).toBe(true);
  });

  it('fails when an error step is present', () => {
    expect(noErrorSteps().score({ run: run([search, err]) }).passed).toBe(false);
  });
});
