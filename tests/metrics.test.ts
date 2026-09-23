import { describe, expect, test } from 'vitest';
import { createJevMetrics } from '../src/game/metrics';

describe('Jev session metrics', () => {
  test('reports request rate, latency percentiles, token totals, and estimated cost', () => {
    const metrics = createJevMetrics();
    for (let i = 0; i < 5; i++) metrics.record({ creatureId: `g${i}`, epoch: 0,
      intent: { action: 'EXPLORE' }, elapsedMs: (i + 1) * 10, usage: { inputTokens: 1000, outputTokens: 1 } }, i * 10);
    const summary = metrics.summary(60);
    expect(summary.decisionsPerMinute).toBe(5);
    expect(summary.p50Ms).toBe(30);
    expect(summary.p95Ms).toBe(50);
    expect(summary.inputTokens).toBe(5000);
    expect(summary.estimatedUsd).toBeCloseTo(.00021);
  });
});
