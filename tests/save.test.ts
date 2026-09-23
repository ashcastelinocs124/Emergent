import { describe, expect, test } from 'vitest';
import { loadSave, serializeSave } from '../src/shared/save';
import { emptyJournal, recordObservation } from '../src/shared/journal';
import { at, creature, world } from './fixtures';
import { createPersistence } from '../src/game/persistence';

describe('expedition save format', () => {
  test('round trips world, inventory, repair, journal, and individual memory', () => {
    const guardian = creature('guardian-1', 'guardian');
    guardian.memory.events.push({ id: 'theft', type: 'egg_stolen', otherId: 'player', at: 8 });
    const scene = world([guardian]);
    scene.componentInstalled = true;
    scene.player.inventory.push({ id: 'egg-1', kind: 'egg', position: at(1, 1), available: false });
    const journal = recordObservation(emptyJournal(), { id: 'seen', creatureId: 'guardian-1', speciesId: 'guardian',
      action: 'FOLLOW', at: 9, position: at(1, 1), carriedItem: 'egg', note: 'It followed.' },
    { lineOfSight: true, distance: 3, orientation: 1 });
    expect(loadSave(serializeSave(scene, journal))).toEqual({ world: scene, journal });
  });

  test('rejects truncated JSON and unsupported future versions with recovery messages', () => {
    expect(() => loadSave('{')).toThrow(/damaged/i);
    expect(() => loadSave(JSON.stringify({ version: 99 }))).toThrow(/newer/i);
  });

  test('rejects malformed internal state without constructing a scene', () => {
    expect(() => loadSave(JSON.stringify({ version: 1, world: { player: {} }, journal: {} }))).toThrow(/damaged/i);
  });

  test('restores the previous valid browser snapshot after current save corruption', () => {
    const values = new Map<string, string>();
    const storage = { getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => { values.set(key, value); },
      removeItem: (key: string) => { values.delete(key); } };
    const persistence = createPersistence(storage);
    const scene = world([]);
    persistence.write(scene, emptyJournal());
    persistence.write({ ...scene, time: 22 }, emptyJournal());
    values.set('alien-ecosystem:expedition:v1', '{');
    expect(persistence.load()?.world.time).toBe(scene.time);
  });
});
