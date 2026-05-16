import type { Scorer } from '@agentkit-eval/core';

function asString(v: unknown): string {
  return typeof v === 'string' ? v : JSON.stringify(v);
}

export function exact<I, O, E = O>(): Scorer<I, O, E> {
  return {
    name: 'exact',
    score({ run, expected }) {
      const passed = asString(run.output) === asString(expected);
      return {
        name: 'exact',
        score: passed ? 1 : 0,
        passed,
        reason: passed ? undefined : `output !== expected`,
      };
    },
  };
}

export function contains<I, O>(needle: string): Scorer<I, O> {
  return {
    name: 'contains',
    score({ run }) {
      const haystack = asString(run.output);
      const passed = haystack.includes(needle);
      return {
        name: 'contains',
        score: passed ? 1 : 0,
        passed,
        reason: passed ? undefined : `output does not contain "${needle}"`,
      };
    },
  };
}

export function regex<I, O>(pattern: RegExp): Scorer<I, O> {
  return {
    name: 'regex',
    score({ run }) {
      const passed = pattern.test(asString(run.output));
      return {
        name: 'regex',
        score: passed ? 1 : 0,
        passed,
        reason: passed ? undefined : `output does not match ${pattern.source}`,
      };
    },
  };
}

export function latencyUnder<I, O>(maxMs: number): Scorer<I, O> {
  return {
    name: 'latencyUnder',
    score({ run }) {
      const passed = run.latencyMs <= maxMs;
      return {
        name: 'latencyUnder',
        score: passed ? 1 : Math.max(0, 1 - (run.latencyMs - maxMs) / maxMs),
        passed,
        reason: passed ? undefined : `${run.latencyMs}ms > ${maxMs}ms`,
      };
    },
  };
}

export function costUnder<I, O>(maxUsd: number): Scorer<I, O> {
  return {
    name: 'costUnder',
    score({ run }) {
      const cost = run.costUsd ?? 0;
      const passed = cost <= maxUsd;
      return {
        name: 'costUnder',
        score: passed ? 1 : 0,
        passed,
        reason: passed ? undefined : `$${cost.toFixed(4)} > $${maxUsd.toFixed(4)}`,
      };
    },
  };
}

export interface LLMJudgeOptions {
  rubric: string;
  judge: (args: { rubric: string; output: string; expected?: string }) => Promise<{
    score: number;
    reason?: string;
  }>;
  passThreshold?: number;
}

export function llmJudge<I, O, E = unknown>(options: LLMJudgeOptions): Scorer<I, O, E> {
  const threshold = options.passThreshold ?? 0.7;
  return {
    name: 'llmJudge',
    async score({ run, expected }) {
      const verdict = await options.judge({
        rubric: options.rubric,
        output: asString(run.output),
        expected: expected === undefined ? undefined : asString(expected),
      });
      const score = Math.min(1, Math.max(0, verdict.score));
      const passed = score >= threshold;
      return {
        name: 'llmJudge',
        score,
        passed,
        reason: verdict.reason,
      };
    },
  };
}
