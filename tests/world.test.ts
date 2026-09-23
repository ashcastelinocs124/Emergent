import { describe, expect, test } from 'vitest';
import { applyDecision, createInitialWorld, stepWorld } from '../src/game/world';
import { at, creature, world } from './fixtures';
import { getValidIntents } from '../src/shared/species';

describe('fixed-step creature actions', () => {
  test('HUNT closes on prey and emits contact only when reached', () => {
    const hunter = creature('s', 'stalker', at(0, 0));
    const prey = creature('g', 'grazer', at(5, 0));
    hunter.currentIntent = { action: 'HUNT', targetId: 'g' };
    hunter.actionEndsAt = 20;
    const result = stepWorld(world([hunter, prey]), 1);
    expect(result.world.creatures[0].position.x).toBeGreaterThan(0);
    expect(result.events).toContainEqual(expect.objectContaining({ type: 'attacked', creatureId: 's', otherId: 'g' }));
    expect(result.world.creatures[1].health).toBeLessThan(1);
  });

  test('FLEE increases distance from a threat', () => {
    const grazer = creature('g', 'grazer', at(0, 0));
    const stalker = creature('s', 'stalker', at(3, 0));
    grazer.currentIntent = { action: 'FLEE', targetId: 's' };
    grazer.actionEndsAt = 20;
    const result = stepWorld(world([grazer, stalker]), .5);
    expect(result.world.creatures[0].position.x).toBeLessThan(0);
  });

  test('EAT consumes food only after reaching it', () => {
    const grazer = creature('g', 'grazer');
    grazer.currentIntent = { action: 'EAT', targetId: 'spore-1' };
    grazer.actionEndsAt = 20;
    const scene = world([grazer]);
    scene.items.push({ id: 'spore-1', kind: 'spore', position: at(12, 0), available: true });
    const far = stepWorld(scene, .1);
    expect(far.world.items[0].available).toBe(true);
    expect(far.world.creatures[0].hunger).toBeGreaterThanOrEqual(.5);
    scene.items[0].position = at(.5, 0);
    const near = stepWorld(scene, .1);
    expect(near.world.items[0].available).toBe(false);
    expect(near.world.creatures[0].hunger).toBeLessThan(.5);
    expect(near.events).toContainEqual(expect.objectContaining({ type: 'ate', creatureId: 'g', otherId: 'spore-1' }));
  });

  test('MATE requires a live ready partner', () => {
    const a = creature('a', 'grazer');
    const b = creature('b', 'grazer', at(1, 0));
    a.mateDrive = .9;
    b.mateDrive = .9;
    a.currentIntent = { action: 'MATE', targetId: 'b' };
    a.actionEndsAt = 20;
    expect(stepWorld(world([a, b]), .1).events).toContainEqual(expect.objectContaining({ type: 'mated', creatureId: 'a', otherId: 'b' }));
    b.alive = false;
    expect(stepWorld(world([a, b]), .1).events.some(event => event.type === 'mated')).toBe(false);
  });

  test('a creature awaiting Jev stays still without choosing an action locally', () => {
    const grazer = creature('g', 'grazer', at(3, 4));
    const result = stepWorld(world([grazer]), 1);
    expect(result.world.creatures[0].position).toEqual(at(3, 4));
    expect(result.world.creatures[0].currentIntent).toBeNull();
  });

  test('matching Jev result begins an offered action; stale or unoffered results do not', () => {
    const grazer = creature('g', 'grazer');
    const scene = world([grazer]);
    const started = applyDecision(scene, { creatureId: 'g', epoch: 0, intent: { action: 'EXPLORE' } });
    expect(started.creatures[0].currentIntent).toEqual({ action: 'EXPLORE' });
    expect(applyDecision(scene, { creatureId: 'g', epoch: 1, intent: { action: 'EXPLORE' } })).toBe(scene);
    expect(applyDecision(scene, { creatureId: 'g', epoch: 0, intent: { action: 'HUNT', targetId: 'player' } })).toBe(scene);
  });

  test('the same seed and step produce the same ecosystem state', () => {
    const a = createInitialWorld(42, at(-20, 10), at(50, -40));
    const b = createInitialWorld(42, at(-20, 10), at(50, -40));
    expect(a).toEqual(b);
    expect(stepWorld(a, .05)).toEqual(stepWorld(b, .05));
    expect(a.creatures).toHaveLength(30);
    expect(a.creatures.every(candidate => candidate.currentIntent === null)).toBe(true);
    expect(a.creatures.every(candidate => Math.hypot(candidate.position.x + 20, candidate.position.z - 10) > 8)).toBe(true);
  });

  test('ten simulated minutes keep decisions bounded and creatures progressing', () => {
    let scene = createInitialWorld(42, at(-20, 10), at(50, -40));
    let decisions = 0;
    for (let step = 0; step < 12_000; step++) {
      scene = stepWorld(scene, .05).world;
      for (const candidate of scene.creatures) {
        if (!candidate.alive || candidate.currentIntent || scene.time < candidate.nextDecisionAt) continue;
        const intent = getValidIntents(candidate, scene)[0];
        if (intent) {
          scene = applyDecision(scene, { creatureId: candidate.id, epoch: candidate.decisionEpoch, intent });
          decisions++;
        }
      }
    }
    expect(decisions).toBeGreaterThan(100);
    expect(decisions).toBeLessThan(3_000);
    expect(scene.creatures.filter(candidate => candidate.alive && candidate.currentIntent).length).toBeGreaterThan(10);
  });
});
