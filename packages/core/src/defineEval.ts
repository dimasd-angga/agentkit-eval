import type { EvalDefinition } from './types.js';

export function defineEval<TInput, TOutput, TExpected = unknown>(
  def: EvalDefinition<TInput, TOutput, TExpected>,
): EvalDefinition<TInput, TOutput, TExpected> {
  if (!def.name) throw new Error('defineEval: `name` is required');
  if (!def.agent) throw new Error('defineEval: `agent` is required');
  if (!Array.isArray(def.scorers)) throw new Error('defineEval: `scorers` must be an array');
  return def;
}
