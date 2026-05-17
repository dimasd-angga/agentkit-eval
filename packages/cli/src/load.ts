import { pathToFileURL } from 'node:url';
import type { EvalDefinition } from '@agentkit-eval/core';

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

let tsxRegistered = false;

export async function loadEvalsFromFile(
  file: string,
): Promise<EvalDefinition<unknown, unknown, unknown>[]> {
  if (!tsxRegistered) {
    await import('tsx/esm/api').then(({ register }) => register());
    tsxRegistered = true;
  }
  // Cache-bust so watch mode picks up edits.
  const url = `${pathToFileURL(file).href}?t=${Date.now()}`;
  const mod = (await import(url)) as Record<string, unknown>;
  const found: EvalDefinition<unknown, unknown, unknown>[] = [];
  for (const value of Object.values(mod)) {
    if (isEvalDefinition(value)) found.push(value);
  }
  return found;
}
