import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';
import type { EvalRunFile } from './types.js';

export async function writeRunFile(run: EvalRunFile, dir: string): Promise<string> {
  const path = join(dir, run.evalName, `${run.runId}.json`);
  await mkdir(dirname(path), { recursive: true });
  await writeFile(path, JSON.stringify(run, null, 2), 'utf8');
  return path;
}

export function renderMarkdownReport(run: EvalRunFile): string {
  const lines: string[] = [];
  lines.push(`# ${run.evalName}`);
  lines.push('');
  lines.push(`- Run: \`${run.runId}\``);
  lines.push(`- Started: ${run.startedAt}`);
  lines.push(`- Finished: ${run.finishedAt}`);
  lines.push(`- Pass: ${run.summary.pass} / Fail: ${run.summary.fail}`);
  if (run.summary.totalCostUsd > 0) {
    lines.push(`- Total cost: $${run.summary.totalCostUsd.toFixed(4)}`);
  }
  lines.push(`- Latency p50/p95: ${run.summary.p50LatencyMs}ms / ${run.summary.p95LatencyMs}ms`);
  lines.push('');

  lines.push('## Mean scores');
  lines.push('');
  lines.push('| Scorer | Score |');
  lines.push('| --- | --- |');
  for (const [name, score] of Object.entries(run.summary.meanScores)) {
    lines.push(`| ${name} | ${score.toFixed(3)} |`);
  }
  lines.push('');

  lines.push('## Cases');
  lines.push('');
  for (const c of run.cases) {
    const mark = c.passed ? 'PASS' : 'FAIL';
    lines.push(`### ${mark} — ${c.name}`);
    if (c.error) lines.push(`- error: ${c.error.message}`);
    for (const s of c.scores) {
      const ok = s.passed ?? s.score >= 1 ? '✓' : '✗';
      const reason = s.reason ? ` — ${s.reason}` : '';
      lines.push(`- ${ok} **${s.name}** ${s.score.toFixed(3)}${reason}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}
