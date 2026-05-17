import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  type EvalDefinition,
  type EvalRunFile,
  printCase,
  printHeader,
  printSummary,
  runEval,
  writeRunFile,
} from '@agentkit-eval/core';
import { glob } from 'tinyglobby';
import { loadEvalsFromFile } from '../load.js';

interface ParsedArgs {
  patterns: string[];
  variants: string[];
  outDir: string;
  reportPath?: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    patterns: [],
    variants: [],
    outDir: '.agentkit-eval',
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--variants') {
      const next = argv[++i];
      if (!next) throw new Error('--variants requires a value');
      args.variants = next
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
    } else if (a === '--out') {
      const next = argv[++i];
      if (!next) throw new Error('--out requires a value');
      args.outDir = next;
    } else if (a === '--report') {
      const next = argv[++i];
      if (!next) throw new Error('--report requires a value');
      args.reportPath = next;
    } else if (a && !a.startsWith('--')) {
      args.patterns.push(a);
    }
  }
  if (args.patterns.length === 0) args.patterns.push('**/*.eval.ts', '**/*.eval.js');
  return args;
}

interface CompareCell {
  variant: string;
  pass: number;
  fail: number;
  meanScores: Record<string, number>;
}

interface CompareTable {
  evalName: string;
  scorers: string[];
  cells: CompareCell[];
}

function buildTable(evalName: string, runs: { variant: string; run: EvalRunFile }[]): CompareTable {
  const scorerSet = new Set<string>();
  for (const { run } of runs) for (const name of Object.keys(run.summary.meanScores)) scorerSet.add(name);
  const scorers = [...scorerSet].sort();
  return {
    evalName,
    scorers,
    cells: runs.map(({ variant, run }) => ({
      variant,
      pass: run.summary.pass,
      fail: run.summary.fail,
      meanScores: run.summary.meanScores,
    })),
  };
}

export function renderCompareMarkdown(table: CompareTable): string {
  const lines: string[] = [];
  lines.push(`## ${table.evalName}`);
  lines.push('');
  const headers = ['variant', 'pass / fail', ...table.scorers];
  lines.push(`| ${headers.join(' | ')} |`);
  lines.push(`| ${headers.map(() => '---').join(' | ')} |`);
  for (const cell of table.cells) {
    const cols = [
      cell.variant,
      `${cell.pass} / ${cell.fail}`,
      ...table.scorers.map((s) => (cell.meanScores[s] ?? 0).toFixed(3)),
    ];
    lines.push(`| ${cols.join(' | ')} |`);
  }
  return lines.join('\n');
}

export async function compareCommand(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  if (args.variants.length === 0) {
    process.stderr.write('compare: --variants <name,name,...> is required\n');
    return 2;
  }

  const cwd = process.cwd();
  const outDir = resolve(cwd, args.outDir);
  const files = await glob(args.patterns, {
    cwd,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.agentkit-eval/**'],
    absolute: true,
  });
  if (files.length === 0) {
    process.stderr.write(`no eval files matched: ${args.patterns.join(', ')}\n`);
    return 1;
  }

  const tables: CompareTable[] = [];
  let totalFail = 0;

  for (const file of files) {
    const defs = await loadEvalsFromFile(file);
    for (const def of defs) {
      printHeader(def.name);
      const variantRuns: { variant: string; run: EvalRunFile }[] = [];
      for (const variant of args.variants) {
        process.env.AGENTKIT_VARIANT = variant;
        process.stdout.write(`\nvariant: ${variant}\n`);
        const run = await runEval(def as EvalDefinition<unknown, unknown, unknown>, {
          onCase: (c) => printCase(c),
        });
        printSummary(run);
        const written = await writeRunFile(
          { ...run, evalName: `${run.evalName}/${variant}` },
          outDir,
        );
        process.stdout.write(`  → ${written}\n`);
        totalFail += run.summary.fail;
        variantRuns.push({ variant, run });
      }
      delete process.env.AGENTKIT_VARIANT;
      tables.push(buildTable(def.name, variantRuns));
    }
  }

  const md = tables.map(renderCompareMarkdown).join('\n\n');
  process.stdout.write(`\n${md}\n`);

  if (args.reportPath) {
    const out = resolve(cwd, args.reportPath);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, md, 'utf8');
    process.stdout.write(`\nmatrix: ${out}\n`);
  }

  return totalFail > 0 ? 1 : 0;
}
