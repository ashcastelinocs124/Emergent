import { expect, it } from 'vitest';
import { Scene } from 'three';
import { createCityHabitat } from '../src/city/habitat';
import { materialIds, residentIds } from '../src/city/content';
it('places every resident and material in distinct walkable city sites', () => {
  const scene = new Scene();
  const city = createCityHabitat(scene);
  const points = [...residentIds.map(id => city.residentPositions[id]), ...materialIds.map(id => city.materialPositions[id])];
  expect(points).toHaveLength(7);
  expect(new Set(points.map(point => `${point.x},${point.z}`)).size).toBe(7);
  expect(points.every(point => Math.abs(point.x) < 60 && Math.abs(point.z) < 60 && city.heightAt(point.x, point.z) === 0)).toBe(true);
  expect(scene.children.length).toBeGreaterThan(15);
});

it('blocks solid facades while leaving each repair site approachable', () => {
  const city = createCityHabitat(new Scene());
  expect(city.blocks(-25, -60)).toBe(true);
  expect(city.blocks(0, 0)).toBe(false);
  expect(materialIds.every(id => !city.blocks(city.materialPositions[id].x, city.materialPositions[id].z))).toBe(true);
});
