import { readFile, readdir, stat, writeFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import {
  type EvalDiff,
  type EvalRunFile,
  diffRuns,
  renderDiffMarkdown,
} from '@agentkit-eval/core';

interface ParsedArgs {
  base?: string;
  head?: string;
  out?: string;
  marker?: string;
  baseLabel: string;
  headLabel: string;
}

function parseArgs(argv: string[]): ParsedArgs {
  const args: ParsedArgs = { baseLabel: 'base', headLabel: 'head' };
  const positional: string[] = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--out') {
      const next = argv[++i];
      if (!next) throw new Error('--out requires a value');
      args.out = next;
    } else if (a === '--marker') {
      const next = argv[++i];
      if (!next) throw new Error('--marker requires a value');
      args.marker = next;
    } else if (a === '--base-label') {
      const next = argv[++i];
      if (!next) throw new Error('--base-label requires a value');
      args.baseLabel = next;
    } else if (a === '--head-label') {
      const next = argv[++i];
      if (!next) throw new Error('--head-label requires a value');
      args.headLabel = next;
    } else if (a && !a.startsWith('--')) {
      positional.push(a);
    }
  }
  args.base = positional[0];
  args.head = positional[1];
  return args;
}

async function isDirectory(path: string): Promise<boolean> {
  try {
    const s = await stat(path);
    return s.isDirectory();
  } catch {
    return false;
  }
}

async function loadRunFile(path: string): Promise<EvalRunFile | null> {
  try {
    const buf = await readFile(path, 'utf8');
    return JSON.parse(buf) as EvalRunFile;
  } catch {
    return null;
  }
}

async function latestRunIn(dir: string): Promise<EvalRunFile | null> {
  let entries: string[];
  try {
    entries = await readdir(dir);
  } catch {
    return null;
  }
  const runs: EvalRunFile[] = [];
  for (const name of entries) {
    if (!name.endsWith('.json')) continue;
    const run = await loadRunFile(join(dir, name));
    if (run) runs.push(run);
  }
  if (runs.length === 0) return null;
  runs.sort((a, b) => b.finishedAt.localeCompare(a.finishedAt));
  return runs[0] ?? null;
}

async function collectRunsByEval(root: string): Promise<Map<string, EvalRunFile>> {
  const out = new Map<string, EvalRunFile>();
  let entries: string[];
  try {
    entries = await readdir(root);
  } catch {
    return out;
  }
  for (const name of entries) {
    const dir = join(root, name);
    if (!(await isDirectory(dir))) continue;
    const latest = await latestRunIn(dir);
    if (latest) out.set(latest.evalName, latest);
  }
  return out;
}

async function resolveSide(path: string): Promise<Map<string, EvalRunFile>> {
  const abs = resolve(process.cwd(), path);
  if (await isDirectory(abs)) {
    // Two cases: either a per-eval folder (contains .json files directly)
    // or the root .agentkit-eval folder (contains per-eval subfolders).
    let hasJson = false;
    try {
      for (const name of await readdir(abs)) {
        if (name.endsWith('.json')) {
          hasJson = true;
          break;
        }
      }
    } catch {
      // ignore
    }
    if (hasJson) {
      const latest = await latestRunIn(abs);
      const map = new Map<string, EvalRunFile>();
      if (latest) map.set(latest.evalName, latest);
      return map;
    }
    return collectRunsByEval(abs);
  }
  const run = await loadRunFile(abs);
  const map = new Map<string, EvalRunFile>();
  if (run) map.set(run.evalName, run);
  return map;
}

export async function diffCommand(argv: string[]): Promise<number> {
  const args = parseArgs(argv);
  if (!args.base || !args.head) {
    process.stderr.write('usage: agentkit-eval diff <base> <head> [--out file]\n');
    return 2;
  }

  const [baseMap, headMap] = await Promise.all([
    resolveSide(args.base),
    resolveSide(args.head),
  ]);

  if (headMap.size === 0) {
    process.stderr.write(`no head runs found at ${args.head}\n`);
    return 1;
  }

  const diffs: EvalDiff[] = [];
  for (const [name, head] of headMap) {
    const base = baseMap.get(name) ?? null;
    diffs.push(diffRuns(base, head));
  }
  diffs.sort((a, b) => a.evalName.localeCompare(b.evalName));

  const md = renderDiffMarkdown(diffs, {
    marker: args.marker,
    baseLabel: args.baseLabel,
    headLabel: args.headLabel,
  });

  if (args.out) {
    const path = resolve(process.cwd(), args.out);
    await writeFile(path, `${md}\n`, 'utf8');
    process.stdout.write(`diff: ${path}\n`);
  } else {
    process.stdout.write(`${md}\n`);
  }

  return 0;
}

export { renderDiffMarkdown };
