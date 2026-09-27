import * as THREE from 'three';

type Lane = { axis: 'x' | 'z'; fixed: number; direction: 1 | -1; offset: number; speed: number };
const lanes: Lane[] = [];
for (const axis of ['z', 'x'] as const) {
  for (const [roadIndex, road] of [-160, -80, 0, 80, 160].entries()) {
    for (const side of [-1, 1] as const) {
      const count = axis === 'z' ? 8 : 6;
      for (let phase = 0; phase < count; phase++) lanes.push({
        axis,
        fixed: road + side * 3.7,
        direction: side < 0 ? 1 : -1,
        offset: phase * 320 / count + roadIndex * 23 + (side < 0 ? 0 : 31),
        speed: 8.5 + (roadIndex + phase) % 5 * .85,
      });
    }
  }
}

const matrix = new THREE.Matrix4();
const local = new THREE.Matrix4();
const placed = new THREE.Matrix4();
const wheelRotation = new THREE.Matrix4().makeRotationZ(Math.PI / 2);
const origin = new THREE.Vector3();
const rotation = new THREE.Quaternion();
const unit = new THREE.Vector3(1, 1, 1);
const hiddenScale = new THREE.Vector3(0, 0, 0);
const yAxis = new THREE.Vector3(0, 1, 0);

function instances(name: string, geometry: THREE.BufferGeometry, count: number, material: THREE.Material): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  return mesh;
}

function place(mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, wheel = false): void {
  local.makeTranslation(x, y, z);
  if (wheel) local.multiply(wheelRotation);
  mesh.setMatrixAt(index, placed.multiplyMatrices(matrix, local));
}

export function createGroundTraffic(scene: THREE.Scene): { sync: (elapsed: number, player: { x: number; z: number }) => void; dispose: () => void } {
  const traffic = new THREE.Group(); traffic.name = 'ground-traffic'; scene.add(traffic);
  const paint = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: .55, roughness: .35 });
  const bodies = instances('ground-car-bodies', new THREE.BoxGeometry(2, .68, 4), lanes.length, paint);
  const cabins = instances('ground-car-cabins', new THREE.BoxGeometry(1.65, .62, 2), lanes.length, new THREE.MeshStandardMaterial({ color: 0x27414c, metalness: .4, roughness: .18 }));
  const roofs = instances('ground-car-roofs', new THREE.BoxGeometry(1.43, .075, 1.76), lanes.length, paint);
  const sensors = instances('ground-car-sensors', new THREE.CylinderGeometry(.18, .24, .22, 10), lanes.length, new THREE.MeshStandardMaterial({ color: 0xa2e9e3, emissive: 0x3ecabd, emissiveIntensity: .7, metalness: .6, roughness: .28 }));
  const routeLights = instances('ground-car-route-lights', new THREE.BoxGeometry(.9, .07, .07), lanes.length, new THREE.MeshBasicMaterial({ color: 0x81e9da }));
  const wheels = instances('ground-car-wheels', new THREE.CylinderGeometry(.32, .32, .18, 10), lanes.length * 4, new THREE.MeshStandardMaterial({ color: 0x1b2429, roughness: .91 }));
  const headlights = instances('ground-car-headlights', new THREE.BoxGeometry(1.3, .11, .06), lanes.length, new THREE.MeshBasicMaterial({ color: 0xffe7b6 }));
  const taillights = instances('ground-car-taillights', new THREE.BoxGeometry(1.35, .1, .06), lanes.length, new THREE.MeshBasicMaterial({ color: 0xf06b62 }));
  traffic.add(bodies, cabins, roofs, sensors, routeLights, wheels, headlights, taillights);
  traffic.userData.autonomous = true;
  const palette = [0x566d78, 0x8d655d, 0x6b7f77, 0x777484, 0xa29b85, 0x526981, 0x879da0];
  lanes.forEach((_, index) => {
    const color = new THREE.Color(palette[index % palette.length]);
    bodies.setColorAt(index, color);
    roofs.setColorAt(index, color);
  });
  bodies.instanceColor!.needsUpdate = true; roofs.instanceColor!.needsUpdate = true;

  const sync = (elapsed: number, player: { x: number; z: number }) => {
    lanes.forEach((lane, index) => {
      const playerAlong = lane.axis === 'z' ? player.z : player.x;
      const playerAcross = lane.axis === 'z' ? player.x : player.z;
      const travel = lane.direction * (lane.offset + elapsed * lane.speed);
      const along = travel + Math.round((playerAlong - travel) / 320) * 320;
      const fixed = lane.fixed + Math.round((playerAcross - lane.fixed) / 240) * 240;
      const x = lane.axis === 'x' ? along : fixed;
      const z = lane.axis === 'z' ? along : fixed;
      const near = Math.abs(x - player.x) < 155 && Math.abs(z - player.z) < 155;
      const cityStreet = z > -67;
      origin.set(near && cityStreet ? x : 0, near && cityStreet ? 0 : -1000, near && cityStreet ? z : 0);
      rotation.setFromAxisAngle(yAxis, lane.axis === 'z' ? (lane.direction === 1 ? 0 : Math.PI) : lane.direction * Math.PI / 2);
      matrix.compose(origin, rotation, near && cityStreet ? unit : hiddenScale);
      place(bodies, index, 0, .79, 0);
      place(cabins, index, 0, 1.34, -.16);
      place(roofs, index, 0, 1.69, -.16);
      place(sensors, index, 0, 1.84, -.16);
      place(routeLights, index, 0, 1.67, .75);
      place(headlights, index, 0, .82, 2.04);
      place(taillights, index, 0, .82, -2.04);
      for (let wheel = 0; wheel < 4; wheel++) place(wheels, index * 4 + wheel, wheel % 2 ? 1 : -1, .34, wheel < 2 ? -1.25 : 1.25, true);
    });
    for (const part of traffic.children as THREE.InstancedMesh[]) part.instanceMatrix.needsUpdate = true;
  };
  sync(0, { x: 0, z: 0 });
  return { sync, dispose: () => scene.remove(traffic) };
}
