import { describe, expect, test } from 'vitest';
import { createDecisionScheduler } from '../src/game/scheduler';
import type { DecisionInput, DecisionResult } from '../src/shared/model';
import { creature, world } from './fixtures';

const intents = [{ action: 'EXPLORE' as const }];
const input: DecisionInput = { creatureId: 'g1', epoch: 4, intents, world: world([creature('g1', 'guardian')]) };

describe('creature decision scheduler', () => {
  test('discards a stale decision after the world advances', () => {
    const scheduler = createDecisionScheduler(() => new Promise<DecisionResult>(() => {}));
    expect(scheduler.issue(input)).toBe(true);
    scheduler.invalidate('g1', 5);
    scheduler.accept({ creatureId: 'g1', epoch: 4, intent: intents[0] });
    expect(scheduler.takeReady('g1')).toBeNull();
  });

  test('never starts two requests for the same creature at once', () => {
    const scheduler = createDecisionScheduler(() => new Promise<DecisionResult>(() => {}));
    expect(scheduler.issue(input)).toBe(true);
    expect(scheduler.issue(input)).toBe(false);
  });

  test('delivers a matching Jev result once', async () => {
    const result: DecisionResult = { creatureId: 'g1', epoch: 4, intent: intents[0] };
    const scheduler = createDecisionScheduler(async () => result);
    scheduler.issue(input);
    await Promise.resolve();
    expect(scheduler.takeReady('g1')).toEqual(result);
    expect(scheduler.takeReady('g1')).toBeNull();
  });

  test('surfaces a service error without choosing an action locally', async () => {
    const scheduler = createDecisionScheduler(async () => { throw new Error('service offline'); });
    scheduler.issue(input);
    await Promise.resolve();
    expect(scheduler.takeReady('g1')).toBeNull();
    expect(scheduler.takeError('g1')?.message).toBe('service offline');
  });

  test('a request that never responds times out and ignores its late reply', async () => {
    let resolveLate!: (result: DecisionResult) => void;
    const scheduler = createDecisionScheduler(() => new Promise(resolve => { resolveLate = resolve; }), 5);
    scheduler.issue(input);
    await new Promise(resolve => setTimeout(resolve, 25));
    expect(scheduler.takeError('g1')?.message).toMatch(/timed out/i);
    resolveLate({ creatureId: 'g1', epoch: 4, intent: intents[0] });
    await Promise.resolve();
    expect(scheduler.takeReady('g1')).toBeNull();
  });

  test('a late old reply cannot cancel a replacement with a newer epoch', async () => {
    const replies: ((result: DecisionResult) => void)[] = [];
    const scheduler = createDecisionScheduler(() => new Promise(resolve => { replies.push(resolve); }));
    scheduler.issue(input);
    scheduler.invalidate('g1', 5);
    scheduler.issue({ ...input, epoch: 5 });
    replies[0]({ creatureId: 'g1', epoch: 4, intent: intents[0] });
    await Promise.resolve();
    replies[1]({ creatureId: 'g1', epoch: 5, intent: intents[0] });
    await Promise.resolve();
    expect(scheduler.takeReady('g1')?.epoch).toBe(5);
    expect(scheduler.takeError('g1')).toBeNull();
  });

  test('a timed-out reply cannot replace a later retry of the same epoch', async () => {
    const replies: ((result: DecisionResult) => void)[] = [];
    const scheduler = createDecisionScheduler(() => new Promise(resolve => { replies.push(resolve); }), 5);
    scheduler.issue(input);
    await new Promise(resolve => setTimeout(resolve, 15));
    expect(scheduler.takeError('g1')?.message).toMatch(/timed out/i);
    scheduler.issue(input);
    replies[0]({ creatureId: 'g1', epoch: 4, intent: intents[0] });
    await Promise.resolve();
    expect(scheduler.takeReady('g1')).toBeNull();
    replies[1]({ creatureId: 'g1', epoch: 4, intent: intents[0] });
    await Promise.resolve();
    expect(scheduler.takeReady('g1')?.epoch).toBe(4);
  });
});
