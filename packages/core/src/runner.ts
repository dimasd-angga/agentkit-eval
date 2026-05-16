import type {
  CaseResult,
  EvalCase,
  EvalDefinition,
  EvalRunFile,
  EvalSummary,
  ScorerResult,
} from './types.js';

const VERSION = '0.0.1';

function makeRunId(): string {
  const t = Date.now().toString(36);
  const r = Math.random().toString(36).slice(2, 10);
  return `${t}-${r}`;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.floor((p / 100) * sorted.length));
  return sorted[idx] ?? 0;
}

async function resolveCases<TInput, TExpected>(
  cases: EvalDefinition<TInput, unknown, TExpected>['cases'],
): Promise<EvalCase<TInput, TExpected>[]> {
  if (typeof cases === 'function') return await cases();
  return cases;
}

function withTimeout<T>(promise: Promise<T>, ms: number | undefined, label: string): Promise<T> {
  if (!ms || ms <= 0) return promise;
  return new Promise<T>((resolve, reject) => {
    const id = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
    promise.then(
      (v) => {
        clearTimeout(id);
        resolve(v);
      },
      (e) => {
        clearTimeout(id);
        reject(e);
      },
    );
  });
}

async function runWithConcurrency<T, R>(
  items: T[],
  limit: number,
  worker: (item: T) => Promise<R>,
): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let cursor = 0;
  const lanes = Math.max(1, Math.min(limit, items.length));
  const runLane = async () => {
    while (true) {
      const i = cursor++;
      if (i >= items.length) return;
      const item = items[i] as T;
      results[i] = await worker(item);
    }
  };
  await Promise.all(Array.from({ length: lanes }, () => runLane()));
  return results;
}

export interface RunEvalOptions {
  onCase?: (result: CaseResult<unknown, unknown, unknown>) => void;
}

export async function runEval<TInput, TOutput, TExpected>(
  def: EvalDefinition<TInput, TOutput, TExpected>,
  options: RunEvalOptions = {},
): Promise<EvalRunFile<TInput, TOutput, TExpected>> {
  const startedAt = new Date().toISOString();
  const startTs = Date.now();
  const cases = await resolveCases<TInput, TExpected>(def.cases);
  const concurrency = def.concurrency ?? 4;

  const caseResults = await runWithConcurrency(cases, concurrency, async (c) => {
    const result: CaseResult<TInput, TOutput, TExpected> = {
      name: c.name,
      input: c.input,
      expected: c.expected,
      scores: [],
      passed: false,
    };

    try {
      const run = await withTimeout(
        Promise.resolve(def.agent(c.input)),
        def.timeoutMs,
        `case "${c.name}" agent`,
      );
      result.run = run;

      const scores: ScorerResult[] = [];
      for (const scorer of def.scorers) {
        try {
          const s = await Promise.resolve(scorer.score({ run, expected: c.expected }));
          scores.push(s);
        } catch (err) {
          scores.push({
            name: scorer.name,
            score: 0,
            passed: false,
            reason: err instanceof Error ? err.message : String(err),
          });
        }
      }
      result.scores = scores;
      result.passed = scores.every((s) => (s.passed ?? s.score >= 1));
    } catch (err) {
      result.error = { message: err instanceof Error ? err.message : String(err) };
      result.passed = false;
    }

    options.onCase?.(result as CaseResult<unknown, unknown, unknown>);
    return result;
  });

  const finishedAt = new Date().toISOString();
  const summary = summarize(caseResults, Date.now() - startTs);

  return {
    agentkitEvalVersion: VERSION,
    runId: makeRunId(),
    evalName: def.name,
    startedAt,
    finishedAt,
    cases: caseResults,
    summary,
  };
}

function summarize<TInput, TOutput, TExpected>(
  cases: CaseResult<TInput, TOutput, TExpected>[],
  _totalMs: number,
): EvalSummary {
  let pass = 0;
  let fail = 0;
  let totalCostUsd = 0;
  const latencies: number[] = [];
  const scoreSums: Record<string, { sum: number; count: number }> = {};

  for (const c of cases) {
    if (c.passed) pass++;
    else fail++;

    if (c.run?.costUsd) totalCostUsd += c.run.costUsd;
    if (typeof c.run?.latencyMs === 'number') latencies.push(c.run.latencyMs);

    for (const s of c.scores) {
      const bucket = scoreSums[s.name] ?? { sum: 0, count: 0 };
      bucket.sum += s.score;
      bucket.count += 1;
      scoreSums[s.name] = bucket;
    }
  }

  const meanScores: Record<string, number> = {};
  for (const [name, { sum, count }] of Object.entries(scoreSums)) {
    meanScores[name] = count === 0 ? 0 : sum / count;
  }

  return {
    pass,
    fail,
    meanScores,
    totalCostUsd,
    p50LatencyMs: percentile(latencies, 50),
    p95LatencyMs: percentile(latencies, 95),
  };
}
