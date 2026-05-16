import type { Scorer, TraceStep } from '@agentkit-eval/core';

function toolCallNames(trace: TraceStep[]): string[] {
  const names: string[] = [];
  for (const step of trace) {
    if (step.type === 'tool_call' && step.name) names.push(step.name);
  }
  return names;
}

export function toolsCalled<I, O>(required: readonly string[]): Scorer<I, O> {
  const want = new Set(required);
  return {
    name: 'toolsCalled',
    score({ run }) {
      const called = new Set(toolCallNames(run.trace));
      const missing: string[] = [];
      for (const name of want) {
        if (!called.has(name)) missing.push(name);
      }
      const passed = missing.length === 0;
      return {
        name: 'toolsCalled',
        score: passed ? 1 : 1 - missing.length / want.size,
        passed,
        reason: passed ? undefined : `missing: ${missing.join(', ')}`,
      };
    },
  };
}

export function toolOrder<I, O>(expected: readonly string[]): Scorer<I, O> {
  return {
    name: 'toolOrder',
    score({ run }) {
      const actual = toolCallNames(run.trace);
      let cursor = 0;
      for (const name of actual) {
        if (cursor < expected.length && name === expected[cursor]) cursor++;
      }
      const passed = cursor === expected.length;
      return {
        name: 'toolOrder',
        score: expected.length === 0 ? 1 : cursor / expected.length,
        passed,
        reason: passed
          ? undefined
          : `expected order ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`,
      };
    },
  };
}

export function noTool<I, O>(forbidden: string): Scorer<I, O> {
  return {
    name: 'noTool',
    score({ run }) {
      const called = toolCallNames(run.trace);
      const hit = called.includes(forbidden);
      return {
        name: 'noTool',
        score: hit ? 0 : 1,
        passed: !hit,
        reason: hit ? `forbidden tool "${forbidden}" was called` : undefined,
      };
    },
  };
}

export function stepCountUnder<I, O>(max: number): Scorer<I, O> {
  return {
    name: 'stepCountUnder',
    score({ run }) {
      const n = run.trace.length;
      const passed = n < max;
      return {
        name: 'stepCountUnder',
        score: passed ? 1 : 0,
        passed,
        reason: passed ? undefined : `trace had ${n} steps, limit ${max}`,
      };
    },
  };
}

export function noErrorSteps<I, O>(): Scorer<I, O> {
  return {
    name: 'noErrorSteps',
    score({ run }) {
      const errors = run.trace.filter((s) => s.type === 'error').length;
      const passed = errors === 0;
      return {
        name: 'noErrorSteps',
        score: passed ? 1 : 0,
        passed,
        reason: passed ? undefined : `${errors} error step(s) in trace`,
      };
    },
  };
}
