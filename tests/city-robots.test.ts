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

it('mixes moving service robots with pedestrians in the city, away from the wreck', () => {
  const scene = new Scene();
  const views = createResidentViews(scene);
  const state = createCityState();
  state.player = { x: 0, z: 0 };
  views.sync(state, 0);
  const torsos = scene.getObjectByName('robot-torsos') as InstancedMesh | undefined;
  const visors = scene.getObjectByName('robot-visors') as InstancedMesh | undefined;
  const backlights = scene.getObjectByName('robot-backlights') as InstancedMesh | undefined;
  const beacons = scene.getObjectByName('robot-beacons') as InstancedMesh | undefined;
  expect(torsos?.count).toBeGreaterThanOrEqual(72);
  expect(visors?.count).toBe(torsos?.count);
  expect(backlights?.count).toBe(torsos?.count);
  expect(beacons?.count).toBe(torsos?.count);
  const initial = positions(torsos!);
  expect(initial.filter(position => position.y > 0 && Math.abs(position.x) < 80 && Math.abs(position.z) < 80).length).toBeGreaterThanOrEqual(12);
  views.sync(state, 2);
  expect(positions(torsos!).filter((position, index) => position.y > 0 && initial[index].y > 0 && position.distanceTo(initial[index]) > 2).length).toBeGreaterThanOrEqual(12);
  state.player = { x: -22, z: -175 };
  views.sync(state, 4);
  expect(positions(torsos!).filter(position => position.y > 0 && Math.hypot(position.x + 22, position.z + 175) < 65)).toHaveLength(0);
  views.dispose();
});
