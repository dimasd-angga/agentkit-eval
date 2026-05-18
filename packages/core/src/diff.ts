import type { EvalRunFile } from './types.js';

export interface EvalDiff {
  evalName: string;
  base: { pass: number; fail: number; meanScores: Record<string, number> } | null;
  head: { pass: number; fail: number; meanScores: Record<string, number> };
  scorers: string[];
}

export interface DiffMarkdownOptions {
  marker?: string;
  baseLabel?: string;
  headLabel?: string;
}

const DEFAULT_MARKER = '<!-- agentkit-eval:diff -->';

export function diffRuns(base: EvalRunFile | null, head: EvalRunFile): EvalDiff {
  const headScorers = Object.keys(head.summary.meanScores);
  const baseScorers = base ? Object.keys(base.summary.meanScores) : [];
  const scorers = Array.from(new Set([...baseScorers, ...headScorers])).sort();
  return {
    evalName: head.evalName,
    base: base
      ? {
          pass: base.summary.pass,
          fail: base.summary.fail,
          meanScores: base.summary.meanScores,
        }
      : null,
    head: {
      pass: head.summary.pass,
      fail: head.summary.fail,
      meanScores: head.summary.meanScores,
    },
    scorers,
  };
}

function delta(head: number, base: number): string {
  const d = head - base;
  if (Math.abs(d) < 0.0005) return '·';
  const sign = d > 0 ? '+' : '';
  return `${sign}${d.toFixed(3)}`;
}

function fmt(n: number | undefined): string {
  if (n === undefined) return '—';
  return n.toFixed(3);
}

export function renderDiffMarkdown(
  diffs: EvalDiff[],
  options: DiffMarkdownOptions = {},
): string {
  const marker = options.marker ?? DEFAULT_MARKER;
  const baseLabel = options.baseLabel ?? 'base';
  const headLabel = options.headLabel ?? 'head';
  const lines: string[] = [];
  lines.push(marker);
  lines.push('# Eval report');
  lines.push('');

  if (diffs.length === 0) {
    lines.push('_No eval runs found._');
    return lines.join('\n');
  }

  for (const d of diffs) {
    lines.push(`## ${d.evalName}`);
    lines.push('');
    const headPF = `${d.head.pass} / ${d.head.fail}`;
    const basePF = d.base ? `${d.base.pass} / ${d.base.fail}` : '—';
    lines.push(`- ${headLabel}: **${headPF}** (pass / fail)`);
    lines.push(`- ${baseLabel}: ${basePF}`);
    lines.push('');
    lines.push(`| scorer | ${baseLabel} | ${headLabel} | Δ |`);
    lines.push('| --- | --- | --- | --- |');
    for (const name of d.scorers) {
      const h = d.head.meanScores[name];
      const b = d.base?.meanScores[name];
      const dStr = h !== undefined && b !== undefined ? delta(h, b) : h === undefined ? '—' : 'new';
      lines.push(`| ${name} | ${fmt(b)} | ${fmt(h)} | ${dStr} |`);
    }
    lines.push('');
  }

  return lines.join('\n').trimEnd();
}

export { DEFAULT_MARKER as DIFF_MARKER };
