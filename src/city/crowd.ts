import * as THREE from 'three';

const BLOCK = 80;
const RADIUS = 1;
const SLOTS = 72;
const SIDE = RADIUS * 2 + 1;
const COUNT = SIDE * SIDE * SLOTS;
// The central 15 × 20 blocks have 21,600 stable procedural identities.
// Only the nine blocks nearest the explorer need animated meshes at once.
const CITY_POPULATION = 15 * 20 * SLOTS;

function mesh(name: string, geometry: THREE.BufferGeometry, count: number): THREE.InstancedMesh {
  const people = new THREE.InstancedMesh(geometry, new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .88 }), count);
  people.name = name;
  people.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  people.frustumCulled = false;
  return people;
}

const coats = [0x526979, 0x8c6c5d, 0x6d765e, 0x765d71, 0x8a8170, 0x475a61, 0x967461, 0x596b6e];
const trousers = [0x26343c, 0x3b403f, 0x333646, 0x4a463e];
const skins = [0x704c3e, 0x92644d, 0xb08468, 0xc49d7a, 0xdbc0a1];
const hairs = [0x1e2528, 0x3a302b, 0x5b4537, 0x6d6153];
const position = new THREE.Vector3();
const scale = new THREE.Vector3(1, 1, 1);
const headingRotation = new THREE.Quaternion();
const limbRotation = new THREE.Quaternion();
const personMatrix = new THREE.Matrix4();
const partMatrix = new THREE.Matrix4();
const worldMatrix = new THREE.Matrix4();
const up = new THREE.Vector3(0, 1, 0);
const right = new THREE.Vector3(1, 0, 0);

function place(part: THREE.InstancedMesh, index: number, lx: number, ly: number, lz: number, angle = 0): void {
  position.set(lx, ly, lz);
  limbRotation.setFromAxisAngle(right, angle);
  partMatrix.compose(position, limbRotation, scale);
  part.setMatrixAt(index, worldMatrix.multiplyMatrices(personMatrix, partMatrix));
}

function tileFor(residue: number, playerTile: number): number {
  return residue + Math.round((playerTile - residue) / SIDE) * SIDE;
}

export function createAmbientCrowd(scene: THREE.Scene): { sync: (elapsed: number, player: { x: number; z: number }) => void; dispose: () => void } {
  const crowd = new THREE.Group(); crowd.name = 'ambient-crowd'; scene.add(crowd);
  crowd.userData.cityPopulation = CITY_POPULATION;
  const torsos = mesh('crowd-torsos', new THREE.CylinderGeometry(.22, .18, .63, 7), COUNT);
  const heads = mesh('crowd-heads', new THREE.SphereGeometry(.14, 8, 6), COUNT);
  const hair = mesh('crowd-hair', new THREE.SphereGeometry(.149, 8, 6, 0, Math.PI * 2, 0, Math.PI * .55), COUNT);
  const arms = mesh('crowd-arms', new THREE.CylinderGeometry(.075, .06, .54, 6), COUNT * 2);
  const legs = mesh('crowd-legs', new THREE.CylinderGeometry(.092, .07, .72, 6), COUNT * 2);
  const shoes = mesh('crowd-shoes', new THREE.BoxGeometry(.17, .11, .27), COUNT * 2);
  crowd.add(torsos, heads, hair, arms, legs, shoes);
  for (let index = 0; index < COUNT; index++) {
    const coat = new THREE.Color(coats[(index * 7 + Math.floor(index / SLOTS)) % coats.length]);
    const pants = new THREE.Color(trousers[(index * 3 + Math.floor(index / SLOTS)) % trousers.length]);
    torsos.setColorAt(index, coat);
    heads.setColorAt(index, new THREE.Color(skins[(index * 3 + 2) % skins.length]));
    hair.setColorAt(index, new THREE.Color(hairs[(index + Math.floor(index / 7)) % hairs.length]));
    for (let side = 0; side < 2; side++) {
      arms.setColorAt(index * 2 + side, coat);
      legs.setColorAt(index * 2 + side, pants);
      shoes.setColorAt(index * 2 + side, new THREE.Color(0x242c31));
    }
  }
  for (const part of crowd.children as THREE.InstancedMesh[]) part.instanceColor!.needsUpdate = true;

  let lastElapsed = Number.NEGATIVE_INFINITY, lastTileX = Number.NaN, lastTileZ = Number.NaN;
  const sync = (elapsed: number, player: { x: number; z: number }) => {
    const playerTileX = Math.round(player.x / BLOCK), playerTileZ = Math.round(player.z / BLOCK);
    if (elapsed - lastElapsed < .1 && playerTileX === lastTileX && playerTileZ === lastTileZ) return;
    lastElapsed = elapsed; lastTileX = playerTileX; lastTileZ = playerTileZ;
    for (let index = 0; index < COUNT; index++) {
      const tile = Math.floor(index / SLOTS), slot = index % SLOTS;
      const residueX = tile % SIDE - RADIUS, residueZ = Math.floor(tile / SIDE) - RADIUS;
      const tileX = tileFor(residueX, playerTileX), tileZ = tileFor(residueZ, playerTileZ);
      if (tileZ < -1 || tileZ === -1 && slot >= 8) {
        personMatrix.makeTranslation(0, -1000, 0);
        place(torsos, index, 0, 0, 0);
        place(heads, index, 0, 0, 0);
        place(hair, index, 0, 0, 0);
        for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
          place(arms, index * 2 + sideIndex, 0, 0, 0);
          place(legs, index * 2 + sideIndex, 0, 0, 0);
          place(shoes, index * 2 + sideIndex, 0, 0, 0);
        }
        continue;
      }
      const seed = Math.abs((tileX * 73856093) ^ (tileZ * 19349663) ^ (slot * 83492791));
      const core = tileX === 0 && tileZ === 0;
      const routeSlot = core ? slot : slot % (SLOTS / 2);
      const phase = (Math.floor(routeSlot / 2) / (core ? SLOTS / 2 : SLOTS / 4) + seed % 31 / 310) * Math.PI * 2;
      const strideTime = elapsed * (.64 + seed % 5 * .13) / 14 + phase;
      const along = Math.sin(strideTime) * 29;
      const forward = Math.cos(strideTime) >= 0;
      const vertical = core || slot < SLOTS / 2;
      const side = slot % 2 ? 1 : -1;
      const lane = side * (13.15 + (slot % 4) * .2);
      const x = tileX * BLOCK + (vertical ? lane : along);
      const z = tileZ * BLOCK + (vertical ? along : lane);
      const heading = vertical ? (forward ? 0 : Math.PI) : (forward ? Math.PI / 2 : -Math.PI / 2);
      position.set(x, 0, z);
      headingRotation.setFromAxisAngle(up, heading);
      const stature = .9 + seed % 7 * .025;
      scale.setScalar(stature);
      personMatrix.compose(position, headingRotation, scale);
      scale.setScalar(1);
      const gait = Math.sin(elapsed * (4.8 + seed % 4 * .5) + phase) * .35;
      place(torsos, index, 0, 1.17, 0);
      place(heads, index, 0, 1.67, .015);
      place(hair, index, 0, 1.69, .004);
      for (let sideIndex = 0; sideIndex < 2; sideIndex++) {
        const sign = sideIndex ? 1 : -1;
        place(arms, index * 2 + sideIndex, sign * .27, 1.12, 0, -sign * gait * .65);
        place(legs, index * 2 + sideIndex, sign * .11, .43, 0, sign * gait);
        place(shoes, index * 2 + sideIndex, sign * .11, .07, .07, sign * gait * .4);
      }
    }
    for (const part of crowd.children as THREE.InstancedMesh[]) part.instanceMatrix.needsUpdate = true;
  };
  sync(0, { x: 0, z: 0 });
  return { sync, dispose: () => scene.remove(crowd) };
}
