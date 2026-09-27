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

it('drives numerous ground cars through nearby streets as the player travels', () => {
  const scene = new Scene();
  const views = createResidentViews(scene);
  const state = createCityState();
  state.player = { x: 0, z: 0 };
  views.sync(state, 0);
  const bodies = scene.getObjectByName('ground-car-bodies') as InstancedMesh | undefined;
  expect(bodies).toBeDefined();
  expect(bodies!.count).toBeGreaterThanOrEqual(100);
  expect((scene.getObjectByName('ground-car-sensors') as InstancedMesh | undefined)?.count).toBe(bodies!.count);
  const before = positions(bodies!);
  views.sync(state, 1);
  const afterOneSecond = positions(bodies!);
  expect(afterOneSecond.filter((position, index) => position.y > 0 && before[index].y > 0 && position.distanceTo(before[index]) > 7 && position.distanceTo(before[index]) < 50).length).toBeGreaterThanOrEqual(20);
  views.sync(state, 8);
  expect(positions(bodies!).some((position, index) => position.distanceTo(before[index]) > 4)).toBe(true);
  state.player = { x: 640, z: 560 };
  views.sync(state, 9);
  expect(positions(bodies!).filter(position => Math.abs(position.x - 640) < 160 && Math.abs(position.z - 560) < 160).length).toBeGreaterThanOrEqual(18);
  views.dispose();
});
