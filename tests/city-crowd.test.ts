import { expect, it } from 'vitest';
import { InstancedMesh, Matrix4, Scene, Vector3 } from 'three';
import { createResidentViews } from '../src/city/residents';
import { createCityState } from '../src/city/state';

function positions(mesh: InstancedMesh): Vector3[] {
  const matrix = new Matrix4();
  return Array.from({ length: mesh.count }, (_, index) => {
    mesh.getMatrixAt(index, matrix);
    return new Vector3().setFromMatrixPosition(matrix);
  });
}

it('fills nearby sidewalks with a moving crowd and keeps it near the player across districts', () => {
  const scene = new Scene();
  const views = createResidentViews(scene);
  const state = createCityState();
  state.player = { x: 0, z: 0 };
  views.sync(state, 0);
  const crowd = scene.getObjectByName('ambient-crowd');
  const torsos = crowd?.getObjectByName('crowd-torsos') as InstancedMesh | undefined;
  expect(torsos).toBeDefined();
  expect(crowd?.userData.cityPopulation).toBe(21_600);
  expect(torsos!.count).toBe(648);
  const initial = positions(torsos!);
  expect(initial.filter(position => Math.abs(position.x) < 80 && Math.abs(position.z) < 80).length).toBeGreaterThanOrEqual(100);
  views.sync(state, 2);
  const walked = positions(torsos!).reduce((sum, position, index) => sum + (initial[index].y > -10 ? position.distanceTo(initial[index]) : 0), 0) / initial.filter(position => position.y > -10).length;
  expect(walked).toBeGreaterThan(2);
  state.player = { x: 640, z: 560 };
  views.sync(state, 6);
  const far = positions(torsos!);
  expect(far.filter(position => Math.abs(position.x - 640) < 80 && Math.abs(position.z - 560) < 80).length).toBeGreaterThanOrEqual(12);
  state.player = { x: -22, z: -175 };
  views.sync(state, 8);
  const crashSiteCrowd = positions(torsos!).filter(position => position.y > -10 && Math.hypot(position.x + 22, position.z + 175) < 50);
  expect(crashSiteCrowd.length).toBeLessThanOrEqual(3);
  views.dispose();
});
