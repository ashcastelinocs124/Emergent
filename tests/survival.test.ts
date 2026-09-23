import { describe, expect, test } from 'vitest';
import { dropItem, interact, recoverAtShip, repairShip, tickSuit, useItem } from '../src/shared/survival';
import { at, creature, world } from './fixtures';

describe('expedition survival', () => {
  test('air drains outside the ship and refills in its shelter', () => {
    const scene = world([]);
    scene.player.position = at(0, 0);
    const out = tickSuit(scene.player, 30, scene.shipPosition);
    expect(out.air).toBeLessThan(1);
    const back = tickSuit({ ...out, position: at(-20, 10) }, 30, scene.shipPosition);
    expect(back.air).toBeGreaterThan(out.air);
  });

  test('scanner drains power and zero air triggers recoverable failure', () => {
    const scene = world([]);
    const scan = tickSuit({ ...scene.player, scannerOn: true, air: .01 }, 30, scene.shipPosition);
    expect(scan.power).toBeLessThan(1);
    expect(scan.air).toBe(0);
    expect(scan.health).toBe(0);
    const recovered = tickSuit({ ...scan, position: scene.shipPosition }, 30, scene.shipPosition);
    expect(recovered.air).toBeGreaterThan(0);
    expect(recovered.health).toBeGreaterThan(0);
  });

  test('picking up an egg makes nearby guardian remember; dropping it removes carried threat', () => {
    const guardian = creature('guardian-1', 'guardian', at(2, 0));
    guardian.currentIntent = { action: 'EXPLORE' };
    const scene = world([guardian]);
    scene.player.position = at(0, 0);
    scene.items.push({ id: 'egg-1', kind: 'egg', ownerSpecies: 'guardian', position: at(1, 0), available: true });
    const stolen = interact(scene, 'egg-1');
    expect(stolen.player.inventory.map(item => item.id)).toContain('egg-1');
    expect(stolen.creatures[0].memory.events.some(fact => fact.type === 'egg_stolen')).toBe(true);
    expect(stolen.creatures[0].currentIntent).toBeNull();
    const dropped = dropItem(stolen, 'egg-1');
    expect(dropped.player.inventory).toHaveLength(0);
    expect(dropped.items.find(item => item.id === 'egg-1')?.available).toBe(true);
  });

  test('eggs can be eaten to restore recovery resources', () => {
    const scene = world([]);
    scene.player.food = .2;
    scene.player.health = .5;
    scene.player.inventory.push({ id: 'egg-1', kind: 'egg', ownerSpecies: 'guardian', position: at(0, 0), available: false });
    const used = useItem(scene, 'egg-1');
    expect(used.player.food).toBeGreaterThan(.2);
    expect(used.player.health).toBeGreaterThan(.5);
    expect(used.player.inventory).toHaveLength(0);
  });

  test('spores offer another food source without carrying guardian eggs', () => {
    const scene = world([]);
    scene.player.food = .2;
    scene.player.inventory.push({ id: 'spore-1', kind: 'spore', position: at(0, 0), available: false });
    const used = useItem(scene, 'spore-1');
    expect(used.player.food).toBeGreaterThan(.2);
    expect(used.player.inventory).toHaveLength(0);
  });

  test('regulator is pinned under the clutch until an egg is moved', () => {
    const scene = world([]);
    scene.player.position = at(0, 0);
    scene.items.push({ id: 'ship-component', kind: 'component', position: at(1, 0), available: true });
    scene.items.push({ id: 'egg-1', kind: 'egg', ownerSpecies: 'guardian', position: at(1, 1), available: true });
    expect(interact(scene, 'ship-component')).toBe(scene);
    const disturbed = interact(scene, 'egg-1');
    expect(disturbed.componentExposed).toBe(true);
    const calm = dropItem(disturbed, 'egg-1');
    expect(interact(calm, 'ship-component').player.inventory.some(item => item.kind === 'component')).toBe(true);
  });

  test('only a nearby attentive guardian remembers a witnessed egg theft', () => {
    const witness = creature('witness', 'guardian', at(2, 0));
    witness.facing = at(-1, 0);
    const away = creature('away', 'guardian', at(2, 1));
    away.facing = at(1, 0);
    const scene = world([witness, away]);
    scene.player.position = at(0, 0);
    scene.items.push({ id: 'egg-1', kind: 'egg', ownerSpecies: 'guardian', position: at(1, 0), available: true });
    const after = interact(scene, 'egg-1');
    expect(after.creatures[0].memory.events.some(fact => fact.type === 'egg_stolen')).toBe(true);
    expect(after.creatures[1].memory.events).toHaveLength(0);
  });

  test('a close guardian remembers an egg theft even when the explorer crouches', () => {
    const guardian = creature('guardian-1', 'guardian', at(2, 0));
    guardian.facing = at(-1, 0);
    const scene = world([guardian]);
    scene.player.position = at(0, 0);
    scene.player.hidden = true;
    scene.items.push({ id: 'egg-1', kind: 'egg', ownerSpecies: 'guardian', position: at(1, 0), available: true });
    expect(interact(scene, 'egg-1').creatures[0].memory.events.some(event => event.type === 'egg_stolen')).toBe(true);
  });

  test('repair requires the recovered component and proximity to ship', () => {
    const scene = world([]);
    expect(repairShip(scene)).toBe(scene);
    scene.player.inventory.push({ id: 'ship-component', kind: 'component', position: at(0, 0), available: false });
    expect(repairShip(scene)).toBe(scene);
    scene.player.position = scene.shipPosition;
    const fixed = repairShip(scene);
    expect(fixed.componentInstalled).toBe(true);
    expect(fixed.player.inventory).toHaveLength(0);
  });

  test('suit failure returns the explorer to shelter and leaves carried items retrievable', () => {
    const scene = world([]);
    scene.player.health = 0;
    scene.player.position = at(24, -6);
    scene.player.inventory.push({ id: 'ship-component', kind: 'component', position: at(0, 0), available: false });
    scene.items.push({ id: 'ship-component', kind: 'component', position: at(0, 0), available: false });
    const recovered = recoverAtShip(scene);
    expect(recovered.player.position).toEqual(scene.shipPosition);
    expect(recovered.player.health).toBeGreaterThan(0);
    expect(recovered.player.inventory).toHaveLength(0);
    expect(recovered.items[0]).toMatchObject({ available: true, position: at(24, -6) });
  });
});
