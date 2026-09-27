import { expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Scene, Vector3 } from 'three';
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

it('keeps flying traffic above the streets and moves it through the district', () => {
  const scene = new Scene();
  const city = createCityHabitat(scene);
  const traffic = scene.getObjectByName('flying-traffic');
  expect(traffic).toBeDefined();
  const hulls = traffic!.getObjectByName('flying-car-hulls') as InstancedMesh | undefined;
  expect(hulls).toBeDefined();
  expect(hulls!.count).toBeGreaterThanOrEqual(240);
  const matrix = new Matrix4(), scale = new Vector3();
  const positions = () => Array.from({ length: hulls!.count }, (_, index) => {
    hulls!.getMatrixAt(index, matrix);
    return { position: new Vector3().setFromMatrixPosition(matrix), visible: scale.setFromMatrixScale(matrix).length() > 0 };
  });
  const before = positions();
  expect(before.every(car => car.position.y > 10)).toBe(true);
  city.sync(1, { x: 0, z: 0 });
  const afterOneSecond = positions();
  const citySpeeds = afterOneSecond.map((car, index) => car.visible && before[index].visible ? car.position.distanceTo(before[index].position) : 0).filter(distance => distance > 0 && distance < 80);
  expect(citySpeeds.filter(distance => distance > 15).length).toBeGreaterThanOrEqual(30);
  city.sync(8);
  expect(positions().some((car, index) => !car.position.equals(before[index].position))).toBe(true);
  expect(positions().every(car => car.position.y > 10)).toBe(true);
  city.sync(9, { x: 640, z: 560 });
  expect(positions().every(({ position }) => {
    return Math.abs(position.x - 640) < 200 && Math.abs(position.z - 560) < 200;
  })).toBe(true);
  expect(positions().filter(({ position, visible }) => visible && Math.abs(position.x - 640) < 12 && position.z > 560 && position.z < 680).length).toBeGreaterThanOrEqual(4);
});

it('streams roads and solid buildings around a player far beyond the original district', () => {
  const scene = new Scene();
  const city = createCityHabitat(scene);
  city.sync(0, { x: 640, z: 560 });
  const roads = scene.getObjectByName('district-roads') as InstancedMesh | undefined;
  expect(roads).toBeDefined();
  const matrix = new Matrix4();
  const centers = Array.from({ length: roads!.count }, (_, index) => {
    roads!.getMatrixAt(index, matrix);
    return new Vector3().setFromMatrixPosition(matrix);
  });
  expect(centers.some(position => Math.abs(position.x - 640) < 1 && Math.abs(position.z - 560) < 1)).toBe(true);
  expect(city.blocks(640, 560)).toBe(false);
  expect(city.blocks(664, 536)).toBe(true);
});

it('forms a varied high-rise skyline with stepped towers around the streets', () => {
  const scene = new Scene();
  const city = createCityHabitat(scene);
  city.sync(0, { x: 640, z: 560 });
  const towers = scene.getObjectByName('district-buildings') as InstancedMesh;
  const setbacks = scene.getObjectByName('district-setbacks') as InstancedMesh | undefined;
  const matrix = new Matrix4();
  const heights = Array.from({ length: towers.count }, (_, index) => {
    towers.getMatrixAt(index, matrix);
    return matrix.elements[5];
  });
  expect(Math.max(...heights)).toBeGreaterThan(150);
  expect(heights.filter(height => height > 90).length).toBeGreaterThanOrEqual(20);
  expect(setbacks).toBeDefined();
  expect(setbacks!.count).toBe(towers.count);
});
