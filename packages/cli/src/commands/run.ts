import { mkdir, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
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

interface ParsedArgs {
  patterns: string[];
  outDir: string;
  reportPath?: string;
  bail: boolean;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = {
    patterns: [],
    outDir: '.agentkit-eval',
    bail: false,
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
    } else if (a && !a.startsWith('--')) {
      args.patterns.push(a);
    }
  }
  if (args.patterns.length === 0) args.patterns.push('**/*.eval.ts', '**/*.eval.js');
  return args;
}

function isEvalDefinition(value: unknown): value is EvalDefinition<unknown, unknown, unknown> {
  if (!value || typeof value !== 'object') return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.name === 'string' &&
    typeof v.agent === 'function' &&
    Array.isArray(v.scorers) &&
    'cases' in v
  );
}

async function loadEvalsFromFile(
  file: string,
): Promise<EvalDefinition<unknown, unknown, unknown>[]> {
  await import('tsx/esm/api').then(({ register }) => register());
  const mod = (await import(pathToFileURL(file).href)) as Record<string, unknown>;
  const found: EvalDefinition<unknown, unknown, unknown>[] = [];
  for (const value of Object.values(mod)) {
    if (isEvalDefinition(value)) found.push(value);
  }
  return found;
}

export async function runCommand(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  const cwd = process.cwd();
  const files = await glob(args.patterns, {
    cwd,
    ignore: ['**/node_modules/**', '**/dist/**', '**/.agentkit-eval/**'],
    absolute: true,
  });

  if (files.length === 0) {
    process.stderr.write(`no eval files matched: ${args.patterns.join(', ')}\n`);
    return 1;
  }

  let totalFail = 0;
  const allRuns: EvalRunFile[] = [];

  for (const file of files) {
    const defs = await loadEvalsFromFile(file);
    if (defs.length === 0) continue;

    for (const def of defs) {
      printHeader(def.name);
      const run = await runEval(def, {
        onCase: (c) => {
          printCase(c);
          if (args.bail && !c.passed) {
            process.stdout.write('\n--bail set, stopping\n');
          }
        },
      });
      printSummary(run);
      const path = await writeRunFile(run, resolve(cwd, args.outDir));
      process.stdout.write(`  → ${path}\n`);
      totalFail += run.summary.fail;
      allRuns.push(run);

      if (args.bail && run.summary.fail > 0) {
        return 1;
      }
    }
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
