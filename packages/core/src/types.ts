export type TraceStepType = 'tool_call' | 'tool_result' | 'text' | 'error';

export interface TraceStep {
  type: TraceStepType;
  name?: string;
  args?: unknown;
  result?: unknown;
  latencyMs?: number;
}

export interface AgentRun<TInput, TOutput> {
  input: TInput;
  output: TOutput;
  trace: TraceStep[];
  tokens?: { prompt: number; completion: number };
  costUsd?: number;
  latencyMs: number;
}

export interface EvalCase<TInput, TExpected = unknown> {
  name: string;
  input: TInput;
  expected?: TExpected;
}

export interface ScorerResult {
  name: string;
  score: number;
  passed?: boolean;
  reason?: string;
}

export interface ScorerArgs<TInput, TOutput, TExpected = unknown> {
  run: AgentRun<TInput, TOutput>;
  expected?: TExpected;
}

export interface Scorer<TInput, TOutput, TExpected = unknown> {
  name: string;
  score(args: ScorerArgs<TInput, TOutput, TExpected>): ScorerResult | Promise<ScorerResult>;
}

export type CaseResolver<TInput, TExpected> =
  | EvalCase<TInput, TExpected>[]
  | (() => EvalCase<TInput, TExpected>[] | Promise<EvalCase<TInput, TExpected>[]>);

export interface EvalDefinition<TInput, TOutput, TExpected = unknown> {
  name: string;
  cases: CaseResolver<TInput, TExpected>;
  agent: (input: TInput) => Promise<AgentRun<TInput, TOutput>> | AgentRun<TInput, TOutput>;
  scorers: Scorer<TInput, TOutput, TExpected>[];
  concurrency?: number;
  trials?: number;
  timeoutMs?: number;
}

export interface CaseResult<TInput, TOutput, TExpected> {
  name: string;
  input: TInput;
  run?: AgentRun<TInput, TOutput>;
  expected?: TExpected;
  scores: ScorerResult[];
  passed: boolean;
  error?: { message: string };
}

export interface EvalSummary {
  pass: number;
  fail: number;
  meanScores: Record<string, number>;
  totalCostUsd: number;
  p50LatencyMs: number;
  p95LatencyMs: number;
}

export interface EvalRunFile<TInput = unknown, TOutput = unknown, TExpected = unknown> {
  agentkitEvalVersion: string;
  runId: string;
  evalName: string;
  startedAt: string;
  finishedAt: string;
  git?: { sha: string; branch: string; dirty: boolean };
  cases: CaseResult<TInput, TOutput, TExpected>[];
  summary: EvalSummary;
}
