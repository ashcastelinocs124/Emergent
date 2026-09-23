import type { DecisionResult } from '../shared/model';

// Published Jev early-access rate on 2026-09-15: $0.042 / million input tokens, output free.
export const JEV_INPUT_USD_PER_MILLION = .042;

export interface JevSummary {
  decisions: number;
  decisionsPerMinute: number;
  p50Ms: number;
  p95Ms: number;
  inputTokens: number;
  outputTokens: number;
  estimatedUsd: number;
}

export function createJevMetrics(): { record(result: DecisionResult, time: number): void; summary(time: number): JevSummary } {
  const samples: { at: number; elapsedMs: number; inputTokens: number; outputTokens: number }[] = [];
  return {
    record(result, time) {
      samples.push({ at: time, elapsedMs: result.elapsedMs ?? 0,
        inputTokens: result.usage?.inputTokens ?? 0, outputTokens: result.usage?.outputTokens ?? 0 });
    },
    summary(time) {
      const sorted = samples.map(sample => sample.elapsedMs).sort((a, b) => a - b);
      const percentile = (fraction: number) => sorted.length ? sorted[Math.max(0, Math.ceil(sorted.length * fraction) - 1)] : 0;
      const inputTokens = samples.reduce((sum, sample) => sum + sample.inputTokens, 0);
      return {
        decisions: samples.length,
        decisionsPerMinute: samples.filter(sample => sample.at >= time - 60).length,
        p50Ms: percentile(.5), p95Ms: percentile(.95), inputTokens,
        outputTokens: samples.reduce((sum, sample) => sum + sample.outputTokens, 0),
        estimatedUsd: inputTokens * JEV_INPUT_USD_PER_MILLION / 1_000_000,
      };
    },
  };
}
