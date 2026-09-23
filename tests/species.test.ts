import { describe, expect, test } from 'vitest';
import { getValidIntents } from '../src/shared/species';
import { at, creature, world } from './fixtures';

describe('discoverable species rules', () => {
  test('an unfamiliar guardian cannot attack a player without eggs', () => {
    const guardian = creature('g1', 'guardian');
    const scene = world([guardian]);
    expect(getValidIntents(guardian, scene).filter(intent =>
      intent.targetId === 'player' && (intent.action === 'HUNT' || intent.action === 'DEFEND')
    )).toEqual([]);
  });

  test('carried guardian eggs make defense a valid response inside the nest', () => {
    const guardian = creature('g1', 'guardian');
    const scene = world([guardian]);
    scene.player.inventory.push({ id: 'egg-1', kind: 'egg', position: at(0, 0), ownerSpecies: 'guardian', available: false });
    expect(getValidIntents(guardian, scene)).toContainEqual({ action: 'DEFEND', targetId: 'player' });
    expect(getValidIntents(guardian, scene).every(intent => ['DEFEND', 'FOLLOW', 'FLEE'].includes(intent.action))).toBe(true);
  });

  test('crouching out of detection range removes guardian defense until close', () => {
    const guardian = creature('g1', 'guardian', at(0, 0));
    const scene = world([guardian]);
    scene.player.position = at(12, 0);
    scene.player.hidden = true;
    scene.player.inventory.push({ id: 'egg-1', kind: 'egg', position: at(0, 0), ownerSpecies: 'guardian', available: false });
    expect(getValidIntents(guardian, scene)).not.toContainEqual({ action: 'DEFEND', targetId: 'player' });
    scene.player.position = at(3, 0);
    expect(getValidIntents(guardian, scene)).toContainEqual({ action: 'DEFEND', targetId: 'player' });
  });

  test('a previously robbed guardian recognizes the player without attacking', () => {
    const guardian = creature('g1', 'guardian');
    guardian.memory.events.push({ id: 'theft-1', type: 'egg_stolen', otherId: 'player', at: 5 });
    const intents = getValidIntents(guardian, world([guardian]));
    expect(intents).toContainEqual({ action: 'FOLLOW', targetId: 'player' });
    expect(intents).not.toContainEqual({ action: 'DEFEND', targetId: 'player' });
  });

  test('a grazer can flee a nearby stalker', () => {
    const grazer = creature('a', 'grazer');
    const stalker = creature('b', 'stalker', at(5, 0));
    expect(getValidIntents(grazer, world([grazer, stalker]))).toContainEqual({ action: 'FLEE', targetId: 'b' });
  });

  test('a stalker can hunt a living grazer, but not a dead one', () => {
    const stalker = creature('s', 'stalker');
    const grazer = creature('a', 'grazer', at(5, 0));
    expect(getValidIntents(stalker, world([stalker, grazer]))).toContainEqual({ action: 'HUNT', targetId: 'a' });
    grazer.alive = false;
    expect(getValidIntents(stalker, world([stalker, grazer]))).not.toContainEqual({ action: 'HUNT', targetId: 'a' });
  });

  test('a creature without a target can still explore', () => {
    const grazer = creature('a', 'grazer');
    expect(getValidIntents(grazer, world([grazer]))).toContainEqual({ action: 'EXPLORE' });
  });

  test('a ready creature can mate with a living member of its species', () => {
    const a = creature('a', 'grazer');
    const b = creature('b', 'grazer', at(3, 0));
    a.mateDrive = .9;
    b.mateDrive = .9;
    expect(getValidIntents(a, world([a, b]))).toContainEqual({ action: 'MATE', targetId: 'b' });
  });
});
