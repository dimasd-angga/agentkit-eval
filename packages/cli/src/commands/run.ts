import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import {
  type EvalDefinition,
  type EvalRunFile,
  printCase,
  printHeader,
  printSummary,
  renderMarkdownReport,
  runEval,
  writeRunFile,
} from '@agentkit-eval/core';
import { glob } from 'tinyglobby';
import { loadEvalsFromFile } from '../load.js';
import { startWatch } from '../watch.js';

interface ParsedArgs {
  patterns: string[];
  outDir: string;
  reportPath?: string;
  bail: boolean;
  watch: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    patterns: [],
    outDir: '.agentkit-eval',
    bail: false,
    watch: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') {
      const next = argv[++i];
      if (!next) throw new Error('--out requires a value');
      args.outDir = next;
    } else if (a === '--report') {
      const next = argv[++i];
      if (!next) throw new Error('--report requires a value');
      args.reportPath = next;
    } else if (a === '--bail') {
      args.bail = true;
    } else if (a === '--watch' || a === '-w') {
      args.watch = true;
    } else if (a && !a.startsWith('--')) {
      args.patterns.push(a);
    }
  }
  if (args.patterns.length === 0) args.patterns.push('**/*.eval.ts', '**/*.eval.js');
  return args;
}

async function discoverFiles(patterns: string[], cwd: string): Promise<string[]> {
  return glob(patterns, {
    cwd,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.agentkit-eval/**'],
    absolute: true,
  });
}

interface RunFileOptions {
  outDir: string;
  bail: boolean;
}

async function runFile(
  file: string,
  options: RunFileOptions,
): Promise<{ runs: EvalRunFile[]; failed: number; bailed: boolean }> {
  const defs = await loadEvalsFromFile(file);
  const runs: EvalRunFile[] = [];
  let failed = 0;
  for (const def of defs) {
    printHeader(def.name);
    const run = await runEval(def as EvalDefinition<unknown, unknown, unknown>, {
      onCase: (c) => printCase(c),
    });
    printSummary(run);
    const path = await writeRunFile(run, options.outDir);
    process.stdout.write(`  → ${path}\n`);
    runs.push(run);
    failed += run.summary.fail;
    if (options.bail && run.summary.fail > 0) {
      return { runs, failed, bailed: true };
    }
  }
  return { runs, failed, bailed: false };
}

export async function runCommand(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const cwd = process.cwd();
  const outDir = resolve(cwd, args.outDir);
  const files = await discoverFiles(args.patterns, cwd);

  if (files.length === 0) {
    process.stderr.write(`no eval files matched: ${args.patterns.join(', ')}\n`);
    return 1;
  }

  if (args.watch) {
    await startWatch({
      files,
      cwd,
      run: (file) => runFile(file, { outDir, bail: args.bail }).then(() => undefined),
    });
    return 0;
  }

  let totalFail = 0;
  const allRuns: EvalRunFile[] = [];
  for (const file of files) {
    const { runs, failed, bailed } = await runFile(file, { outDir, bail: args.bail });
    totalFail += failed;
    allRuns.push(...runs);
    if (bailed) return 1;
  }

  if (args.reportPath) {
    const md = allRuns.map((r) => renderMarkdownReport(r)).join('\n\n---\n\n');
    const out = resolve(cwd, args.reportPath);
    await mkdir(dirname(out), { recursive: true });
    await writeFile(out, md, 'utf8');
    process.stdout.write(`\nreport: ${out}\n`);
  }

  return totalFail > 0 ? 1 : 0;
}
