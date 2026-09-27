import * as THREE from 'three';

const BLOCK = 80;
const SIDE = 3;
const SLOTS = 12;
const COUNT = SIDE * SIDE * SLOTS;
const position = new THREE.Vector3();
const localPosition = new THREE.Vector3();
const scale = new THREE.Vector3(1, 1, 1);
const facing = new THREE.Quaternion();
const joint = new THREE.Quaternion();
const robotMatrix = new THREE.Matrix4();
const partMatrix = new THREE.Matrix4();
const combined = new THREE.Matrix4();
const up = new THREE.Vector3(0, 1, 0);
const right = new THREE.Vector3(1, 0, 0);

function instances(name: string, geometry: THREE.BufferGeometry, count: number, color: number, glow = false): THREE.InstancedMesh {
  const surface = glow
    ? new THREE.MeshBasicMaterial({ color })
    : new THREE.MeshStandardMaterial({ color, metalness: .72, roughness: .34 });
  const mesh = new THREE.InstancedMesh(geometry, surface, count);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  return mesh;
}

function tileFor(residue: number, playerTile: number): number {
  return residue + Math.round((playerTile - residue) / SIDE) * SIDE;
}

export function createServiceRobots(scene: THREE.Scene): { sync: (elapsed: number, player: { x: number; z: number }) => void; dispose: () => void } {
  const group = new THREE.Group(); group.name = 'service-robots'; scene.add(group);
  const torsos = instances('robot-torsos', new THREE.BoxGeometry(.5, .76, .34), COUNT, 0xd8e6e3);
  const heads = instances('robot-heads', new THREE.BoxGeometry(.38, .34, .32), COUNT, 0x536f7a);
  const visors = instances('robot-visors', new THREE.BoxGeometry(.33, .12, .045), COUNT, 0x6ae6da, true);
  const chests = instances('robot-chest-lights', new THREE.BoxGeometry(.18, .1, .04), COUNT, 0xf4ba73, true);
  const backlights = instances('robot-backlights', new THREE.BoxGeometry(.13, .57, .05), COUNT, 0x6ae6da, true);
  const beacons = instances('robot-beacons', new THREE.OctahedronGeometry(.105), COUNT, 0xffd696, true);
  const arms = instances('robot-arms', new THREE.BoxGeometry(.13, .62, .17), COUNT * 2, 0x8ca5aa);
  const legs = instances('robot-legs', new THREE.BoxGeometry(.16, .73, .2), COUNT * 2, 0x546e78);
  group.add(torsos, heads, visors, chests, backlights, beacons, arms, legs);

  const place = (mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, swing = 0) => {
    localPosition.set(x, y, z);
    joint.setFromAxisAngle(right, swing);
    partMatrix.compose(localPosition, joint, scale);
    mesh.setMatrixAt(index, combined.multiplyMatrices(robotMatrix, partMatrix));
  };
  const sync = (elapsed: number, player: { x: number; z: number }) => {
    const playerTileX = Math.round(player.x / BLOCK), playerTileZ = Math.round(player.z / BLOCK);
    for (let index = 0; index < COUNT; index++) {
      const tile = Math.floor(index / SLOTS), slot = index % SLOTS;
      const tileX = tileFor(tile % SIDE - 1, playerTileX);
      const tileZ = tileFor(Math.floor(tile / SIDE) - 1, playerTileZ);
      if (tileZ < 0) robotMatrix.makeTranslation(0, -1000, 0);
      else {
        const seed = Math.abs((tileX * 73856093) ^ (tileZ * 19349663) ^ (slot * 83492791));
        const phase = (slot / SLOTS + seed % 17 / 170) * Math.PI * 2;
        const stride = elapsed * (.075 + seed % 4 * .007) + phase;
        const along = Math.sin(stride) * 29;
        const forward = Math.cos(stride) >= 0;
        const vertical = slot < 8;
        const side = slot % 2 ? 1 : -1;
        const lane = side * (14.2 + slot % 3 * .38);
        const x = tileX * BLOCK + (vertical ? lane : along);
        const z = tileZ * BLOCK + (vertical ? along : lane);
        const angle = vertical ? (forward ? 0 : Math.PI) : (forward ? Math.PI / 2 : -Math.PI / 2);
        position.set(x, 0, z);
        facing.setFromAxisAngle(up, angle);
        scale.setScalar(.94 + seed % 5 * .025);
        robotMatrix.compose(position, facing, scale);
        scale.setScalar(1);
      }
      const gait = tileZ < 0 ? 0 : Math.sin(elapsed * 5.8 + index) * .35;
      place(torsos, index, 0, 1.19, 0);
      place(heads, index, 0, 1.77, .01);
      place(visors, index, 0, 1.79, .19);
      place(chests, index, 0, 1.34, .19);
      place(backlights, index, 0, 1.24, -.195);
      place(beacons, index, 0, 2.04, 0);
      for (let side = 0; side < 2; side++) {
        const sign = side ? 1 : -1;
        place(arms, index * 2 + side, sign * .36, 1.13, 0, -sign * gait * .8);
        place(legs, index * 2 + side, sign * .15, .43, 0, sign * gait);
      }
    }
    for (const part of group.children as THREE.InstancedMesh[]) part.instanceMatrix.needsUpdate = true;
  };
  sync(0, { x: 0, z: 0 });
  return { sync, dispose: () => scene.remove(group) };
}
