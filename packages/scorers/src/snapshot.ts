import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { Scorer } from '@agentkit-eval/core';

export type SnapshotMode = 'exact' | 'semantic' | 'llm-judge';

export interface SnapshotJudge {
  (args: { actual: string; expected: string }): Promise<{ score: number; reason?: string }>;
}

export interface SnapshotOptions {
  /** Directory snapshot files live under. Defaults to .agentkit-eval/__snapshots__ */
  dir?: string;
  /** Default file name (without extension). The case name is appended. */
  name?: string;
  /** Comparison mode. Defaults to 'exact'. */
  mode?: SnapshotMode;
  /** Override the update behavior. Defaults to env AGENTKIT_UPDATE_SNAPSHOTS=1. */
  update?: boolean;
  /** Required when mode is 'llm-judge'. */
  judge?: SnapshotJudge;
  /** Threshold for non-exact modes. Defaults to 0.85. */
  passThreshold?: number;
}

function asString(v: unknown): string {
  return typeof v === 'string' ? v : JSON.stringify(v, null, 2);
}

function snapshotPath(dir: string, group: string, caseName: string): string {
  const safe = caseName.replace(/[^a-zA-Z0-9._-]+/g, '_');
  return join(dir, `${group}.${safe}.snap.md`);
}

async function readSnapshot(path: string): Promise<string | null> {
  try {
    return await readFile(path, 'utf8');
  } catch {
    return null;
  }
}

async function writeSnapshot(path: string, value: string): Promise<void> {
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, value, 'utf8');
}

function isUpdate(opt?: boolean): boolean {
  if (typeof opt === 'boolean') return opt;
  return process.env.AGENTKIT_UPDATE_SNAPSHOTS === '1';
}

export function toMatchSnapshot<I, O>(options: SnapshotOptions = {}): Scorer<I, O> {
  const dir = options.dir ?? '.agentkit-eval/__snapshots__';
  const group = options.name ?? 'snapshot';
  const mode: SnapshotMode = options.mode ?? 'exact';
  const threshold = options.passThreshold ?? 0.85;
  if (mode === 'llm-judge' && !options.judge) {
    throw new Error("toMatchSnapshot: mode 'llm-judge' requires `judge`");
  }

  return {
    name: 'toMatchSnapshot',
    async score({ run }) {
      const update = isUpdate(options.update);
      const actual = asString(run.output);
      // Use the run's input as a stable case key.
      const caseKey =
        typeof run.input === 'string' ? run.input : JSON.stringify(run.input);
      const path = snapshotPath(dir, group, caseKey);
      const existing = await readSnapshot(path);

      if (update || existing === null) {
        await writeSnapshot(path, actual);
        return {
          name: 'toMatchSnapshot',
          score: 1,
          passed: true,
          reason: existing === null ? 'written (new)' : 'updated',
        };
      }

      if (mode === 'exact') {
        const passed = actual === existing;
        return {
          name: 'toMatchSnapshot',
          score: passed ? 1 : 0,
          passed,
          reason: passed ? undefined : `output differs from ${path}`,
        };
      }

      if (mode === 'semantic') {
        const score = jaccard(actual, existing);
        const passed = score >= threshold;
        return {
          name: 'toMatchSnapshot',
          score,
          passed,
          reason: passed
            ? undefined
            : `semantic similarity ${score.toFixed(3)} < ${threshold}`,
        };
      }

      const judge = options.judge as SnapshotJudge;
      const verdict = await judge({ actual, expected: existing });
      const score = Math.min(1, Math.max(0, verdict.score));
      const passed = score >= threshold;
      return {
        name: 'toMatchSnapshot',
        score,
        passed,
        reason: verdict.reason,
      };
    },
  };
}

function tokens(text: string): Set<string> {
  return new Set(
    text
      .toLowerCase()
      .split(/\W+/)
      .filter((t) => t.length > 0),
  );
}

function jaccard(a: string, b: string): number {
  const A = tokens(a);
  const B = tokens(b);
  if (A.size === 0 && B.size === 0) return 1;
  let inter = 0;
  for (const t of A) if (B.has(t)) inter++;
  const union = A.size + B.size - inter;
  return union === 0 ? 1 : inter / union;
}
