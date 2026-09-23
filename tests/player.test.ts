import { expect, test } from 'vitest';
import * as THREE from 'three';
import { sceneLineOfSight } from '../src/game/player';

test('a boulder between a guardian and explorer blocks sight', () => {
  const boulder = new THREE.Mesh(new THREE.BoxGeometry(2, 3, 2));
  boulder.position.set(5, 1.5, 0);
  boulder.updateMatrixWorld();
  expect(sceneLineOfSight(new THREE.Vector3(0, 2, 0), new THREE.Vector3(10, 1.5, 0), [boulder])).toBe(false);
  expect(sceneLineOfSight(new THREE.Vector3(0, 2, 4), new THREE.Vector3(10, 1.5, 4), [boulder])).toBe(true);
});
