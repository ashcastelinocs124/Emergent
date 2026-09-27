import { expect, it } from 'vitest';
import { Box3, Scene, Vector3 } from 'three';
import { createCrashShip } from '../src/city/ship';
import { createCityHabitat } from '../src/city/habitat';
import { crashSite } from '../src/city/geography';

it('builds a substantial crashed ship with a hatch and leaves a locator when concealed', () => {
  const scene = new Scene();
  const ship = createCrashShip(scene);
  const wreck = scene.getObjectByName('crash-ship');
  const beacon = scene.getObjectByName('cloaked-ship-beacon');
  expect(wreck).toBeDefined();
  expect(wreck!.position.z).toBe(crashSite.ship.z);
  expect(wreck!.getObjectByName('ship-hatch')).toBeDefined();
  expect(wreck!.children.length).toBeGreaterThanOrEqual(12);
  const size = new Box3().setFromObject(wreck!).getSize(new Vector3());
  expect(size.x).toBeGreaterThan(15);
  expect(size.z).toBeGreaterThan(15);
  expect(size.y).toBeGreaterThan(4);
  ship.sync('hidden', 0);
  expect(wreck!.visible).toBe(false);
  expect(beacon?.visible).toBe(true);
  ship.sync('outside', 1);
  expect(wreck!.visible).toBe(true);
  expect(beacon?.visible).toBe(false);
  ship.sync('aboard', 2);
  expect(wreck!.visible).toBe(false);
});

it('uses the new ship in the playable city', () => {
  const scene = new Scene();
  const city = createCityHabitat(scene);
  expect(scene.getObjectByName('crash-ship')).toBeDefined();
  expect(scene.getObjectByName('crash-outskirts')?.getObjectByName('city-approach-road')).toBeDefined();
  for (const z of [-155, -125, -95, -75]) expect(city.blocks(0, z)).toBe(false);
  city.sync(0, crashSite.exit, 'hidden');
  expect(scene.getObjectByName('crash-ship')?.visible).toBe(false);
});
