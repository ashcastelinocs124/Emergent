import * as THREE from 'three';

type FlightLane = { axis: 'x' | 'z'; fixed: number; altitude: number; direction: 1 | -1; offset: number; speed: number };

const lanes: FlightLane[] = [];
for (const axis of ['z', 'x'] as const) {
  const roads = axis === 'z' ? [-160, -80, 0, 80, 160] : [0, 80, 160, 240];
  for (const [roadIndex, road] of roads.entries()) {
    for (const side of [-1, 1] as const) {
      const count = axis === 'z' ? 16 : 12;
      for (let phase = 0; phase < count; phase++) lanes.push({
        axis,
        fixed: road + side * 5.5,
        altitude: axis === 'z' ? (side < 0 ? 14 : 21) + phase % 3 * 3 : (side < 0 ? 27 : 34) + phase % 3 * 3,
        direction: side < 0 ? 1 : -1,
        offset: phase * 320 / count + roadIndex * 19 + (side < 0 ? 0 : 37),
        speed: 18 + (roadIndex * 3 + phase) % 6 * 2,
      });
    }
  }
}

const carMatrix = new THREE.Matrix4();
const localMatrix = new THREE.Matrix4();
const placedMatrix = new THREE.Matrix4();
const position = new THREE.Vector3();
const rotation = new THREE.Quaternion();
const scale = new THREE.Vector3();
const up = new THREE.Vector3(0, 1, 0);

function instances(name: string, geometry: THREE.BufferGeometry, count: number, material: THREE.Material): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(geometry, material, count);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  return mesh;
}

function place(mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, sx = 1, sy = 1, sz = 1): void {
  localMatrix.makeScale(sx, sy, sz).setPosition(x, y, z);
  mesh.setMatrixAt(index, placedMatrix.multiplyMatrices(carMatrix, localMatrix));
}

export function createFlyingTraffic(scene: THREE.Scene): { sync: (elapsed: number, player?: { x: number; z: number }) => void } {
  const traffic = new THREE.Group(); traffic.name = 'flying-traffic'; scene.add(traffic);
  const paint = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: .7, roughness: .26 });
  const hulls = instances('flying-car-hulls', new THREE.SphereGeometry(1, 12, 8), lanes.length, paint);
  const canopies = instances('flying-car-canopies', new THREE.SphereGeometry(1, 12, 8), lanes.length, new THREE.MeshStandardMaterial({ color: 0x152c3c, metalness: .7, roughness: .26 }));
  const wings = instances('flying-car-wings', new THREE.BoxGeometry(1, 1, 1), lanes.length, paint);
  const thrusters = instances('flying-car-thrusters', new THREE.CylinderGeometry(.32, .32, 1.1, 10), lanes.length * 2, new THREE.MeshStandardMaterial({ color: 0x263d48, metalness: .7, roughness: .26 }));
  const headlights = instances('flying-car-headlights', new THREE.BoxGeometry(1, 1, 1), lanes.length, new THREE.MeshBasicMaterial({ color: 0xffffff }));
  const taillights = instances('flying-car-taillights', new THREE.BoxGeometry(1, 1, 1), lanes.length, new THREE.MeshBasicMaterial({ color: 0xff625a }));
  const underglow = instances('flying-car-underglow', new THREE.BoxGeometry(1, 1, 1), lanes.length, new THREE.MeshBasicMaterial({ color: 0x45cad5 }));
  traffic.add(hulls, canopies, wings, thrusters, headlights, taillights, underglow);
  const palette = [0x9aaeb3, 0x526b78, 0x9d786b, 0x6b8580, 0x697990, 0xb4a78e, 0x607d87];
  lanes.forEach((_, index) => {
    hulls.setColorAt(index, new THREE.Color(palette[index % palette.length]));
    wings.setColorAt(index, new THREE.Color(palette[index % palette.length]));
    headlights.setColorAt(index, new THREE.Color(index % 2 ? 0xffbc78 : 0x7df5ee));
  });
  for (const mesh of [hulls, wings, headlights]) mesh.instanceColor!.needsUpdate = true;

  const sync = (elapsed: number, player = { x: 0, z: 0 }) => {
    lanes.forEach((lane, index) => {
      const playerAlong = lane.axis === 'z' ? player.z : player.x;
      const playerAcross = lane.axis === 'z' ? player.x : player.z;
      const travel = lane.direction * (lane.offset + elapsed * lane.speed - 80);
      const progress = travel + Math.round((playerAlong - travel) / 320) * 320;
      const fixed = lane.fixed + Math.round((playerAcross - lane.fixed) / 240) * 240;
      const x = lane.axis === 'x' ? progress : fixed;
      const z = lane.axis === 'z' ? progress : fixed;
      const visible = z > -65 && Math.abs(x - player.x) < 140 && Math.abs(z - player.z) < 140;
      position.set(x, lane.altitude + Math.sin(elapsed * 1.7 + index) * .18, z);
      rotation.setFromAxisAngle(up, lane.axis === 'z' ? (lane.direction === 1 ? 0 : Math.PI) : lane.direction * Math.PI / 2);
      scale.setScalar(visible ? 1.35 : 0);
      carMatrix.compose(position, rotation, scale);
      place(hulls, index, 0, 0, 0, 1.18, .38, 2.35);
      place(canopies, index, 0, .42, -.22, .76, .38, 1.14);
      place(wings, index, 0, -.12, -.4, 3.2, .13, 1.2);
      for (const [sideIndex, side] of [-1, 1].entries()) {
        localMatrix.makeRotationX(Math.PI / 2).setPosition(side * 1.47, -.1, -.95);
        thrusters.setMatrixAt(index * 2 + sideIndex, placedMatrix.multiplyMatrices(carMatrix, localMatrix));
      }
      place(headlights, index, 0, -.04, 2.28, 1.5, .09, .08);
      place(taillights, index, 0, 0, -2.22, 1.8, .08, .08);
      place(underglow, index, 0, -.37, .1, 1.45, .045, 1.25);
    });
    for (const part of traffic.children as THREE.InstancedMesh[]) part.instanceMatrix.needsUpdate = true;
  };
  sync(0);
  return { sync };
}
