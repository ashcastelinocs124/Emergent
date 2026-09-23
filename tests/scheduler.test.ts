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
});
