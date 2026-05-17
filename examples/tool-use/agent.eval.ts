import { defineEval, type TraceStep } from '@agentkit-eval/core';
import {
  latencyUnder,
  noTool,
  stepCountUnder,
  toolOrder,
  toolsCalled,
} from '@agentkit-eval/scorers';

type Doc = { id: string; title: string; body: string; keywords: string[] };

const corpus: Doc[] = [
  {
    id: 'hours',
    title: 'Store hours',
    body: 'The store is open 9 to 5, Monday through Friday.',
    keywords: ['hours', 'open', 'close', 'when'],
  },
  {
    id: 'returns',
    title: 'Returns',
    body: 'Returns are accepted within 30 days with a receipt.',
    keywords: ['return', 'refund', 'receipt'],
  },
  {
    id: 'shipping',
    title: 'Shipping',
    body: 'Standard shipping arrives in 3 to 5 business days.',
    keywords: ['shipping', 'arrive', 'delivery', 'package'],
  },
];

function search(query: string): string[] {
  const tokens = query.toLowerCase().split(/\W+/).filter(Boolean);
  const scored = corpus.map((d) => {
    const hits = d.keywords.filter((k) => tokens.includes(k)).length;
    return { id: d.id, hits };
  });
  return scored
    .filter((s) => s.hits > 0)
    .sort((a, b) => b.hits - a.hits)
    .map((s) => s.id);
}

function read(id: string): string {
  return corpus.find((d) => d.id === id)?.body ?? '';
}

async function ragAgent(query: string) {
  const t0 = Date.now();
  const trace: TraceStep[] = [];
  const variant = process.env.AGENTKIT_VARIANT ?? 'default';

  trace.push({ type: 'tool_call', name: 'search', args: { query } });
  const hits = search(query);
  trace.push({ type: 'tool_result', name: 'search', result: hits });

  // The "lazy" variant skips the read tool on single-hit results to model a
  // model that takes shortcuts. Useful for demonstrating compare matrices.
  const lazy = variant === 'lazy';
  const top = hits[0];
  let answer = "I don't know.";
  if (top && !(lazy && hits.length === 1)) {
    trace.push({ type: 'tool_call', name: 'read', args: { id: top } });
    const body = read(top);
    trace.push({ type: 'tool_result', name: 'read', result: body });
    answer = body;
  } else if (top) {
    answer = `see: ${top}`;
  }
  trace.push({ type: 'text', result: answer });

  return {
    input: query,
    output: answer,
    trace,
    latencyMs: Date.now() - t0,
  };
}

export const rag = defineEval({
  name: 'rag-tool-use',
  cases: [
    { name: 'hours', input: 'what are the store hours', expected: '9 to 5' },
    { name: 'returns', input: 'how long for a refund', expected: '30 days' },
    { name: 'shipping', input: 'when will my package arrive', expected: '3 to 5' },
  ],
  agent: ragAgent,
  scorers: [
    toolsCalled(['search', 'read']),
    toolOrder(['search', 'read']),
    noTool('delete'),
    stepCountUnder(10),
    latencyUnder(50),
  ],
});
