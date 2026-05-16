import { access, mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const STARTER = `import { defineEval } from '@agentkit-eval/core';
import { toolOrder, toolsCalled, contains } from '@agentkit-eval/scorers';

async function searchAgent(query: string) {
  const t0 = Date.now();
  // Replace with a real agent call. This stub fakes a tool-using run so the
  // eval has something to score on first execution.
  const trace = [
    { type: 'tool_call' as const, name: 'search', args: { query } },
    { type: 'tool_result' as const, name: 'search', result: ['doc-1', 'doc-2'] },
    { type: 'tool_call' as const, name: 'read', args: { id: 'doc-1' } },
    { type: 'tool_result' as const, name: 'read', result: 'opening hours: 9-5' },
    { type: 'text' as const, result: 'The store is open 9 to 5.' },
  ];
  return {
    input: query,
    output: 'The store is open 9 to 5.',
    trace,
    latencyMs: Date.now() - t0,
  };
}

export const openingHours = defineEval({
  name: 'opening-hours',
  cases: [
    { name: 'simple', input: 'when does the store open?' },
  ],
  agent: searchAgent,
  scorers: [
    toolsCalled(['search', 'read']),
    toolOrder(['search', 'read']),
    contains('9 to 5'),
  ],
});
`;

async function exists(path: string): Promise<boolean> {
  try {
    await access(path);
    return true;
  } catch {
    return false;
  }
}

export async function initCommand(): Promise<void> {
  const dir = join(process.cwd(), 'evals');
  await mkdir(dir, { recursive: true });
  const file = join(dir, 'opening-hours.eval.ts');
  if (await exists(file)) {
    process.stderr.write(`already exists: ${file}\n`);
    return;
  }
  await writeFile(file, STARTER, 'utf8');
  process.stdout.write(
    `created ${file}\n\nnext:\n  pnpm add -D @agentkit-eval/core @agentkit-eval/scorers @agentkit-eval/cli\n  npx agentkit-eval run\n`,
  );
}
