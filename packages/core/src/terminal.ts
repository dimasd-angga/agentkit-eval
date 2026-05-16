import type { CaseResult, EvalRunFile } from './types.js';

const enabled = process.stdout.isTTY && !process.env.NO_COLOR;

const codes = {
  reset: 0,
  bold: 1,
  dim: 2,
  red: 31,
  green: 32,
  yellow: 33,
  blue: 34,
  cyan: 36,
  gray: 90,
} as const;

type Style = keyof typeof codes;

function wrap(text: string, style: Style): string {
  if (!enabled) return text;
  return `\x1b[${codes[style]}m${text}\x1b[0m`;
}

export const c = {
  bold: (s: string) => wrap(s, 'bold'),
  dim: (s: string) => wrap(s, 'dim'),
  red: (s: string) => wrap(s, 'red'),
  green: (s: string) => wrap(s, 'green'),
  yellow: (s: string) => wrap(s, 'yellow'),
  blue: (s: string) => wrap(s, 'blue'),
  cyan: (s: string) => wrap(s, 'cyan'),
  gray: (s: string) => wrap(s, 'gray'),
};

export function printHeader(name: string): void {
  process.stdout.write(`\n${c.bold(name)}\n`);
}

export function printCase(result: CaseResult<unknown, unknown, unknown>): void {
  const mark = result.passed ? c.green('✓') : c.red('✗');
  process.stdout.write(`  ${mark} ${result.name}\n`);
  if (result.error) {
    process.stdout.write(`    ${c.red('error:')} ${result.error.message}\n`);
    return;
  }
  for (const s of result.scores) {
    const ok = (s.passed ?? s.score >= 1) ? c.green('•') : c.red('•');
    const reason = s.reason ? c.gray(` — ${s.reason}`) : '';
    process.stdout.write(`    ${ok} ${c.dim(s.name)} ${s.score.toFixed(3)}${reason}\n`);
  }
}

export function printSummary(run: EvalRunFile): void {
  const { pass, fail } = run.summary;
  const total = pass + fail;
  const passColor = fail === 0 ? c.green : c.yellow;
  process.stdout.write(
    `\n${passColor(`${pass}/${total} passed`)}` +
      (fail > 0 ? c.red(` · ${fail} failed`) : '') +
      c.dim(
        ` · p50 ${run.summary.p50LatencyMs}ms · p95 ${run.summary.p95LatencyMs}ms` +
          (run.summary.totalCostUsd > 0
            ? ` · $${run.summary.totalCostUsd.toFixed(4)}`
            : ''),
      ) +
      '\n',
  );
}
