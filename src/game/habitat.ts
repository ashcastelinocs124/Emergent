import * as THREE from 'three';

export interface Habitat {
  heightAt(x: number, z: number): number;
  shipPosition: THREE.Vector3;
  nestPosition: THREE.Vector3;
  componentPosition: THREE.Vector3;
}

const WORLD_RADIUS = 150;

export function terrainHeight(x: number, z: number): number {
  const ridges = Math.sin(x * 0.024) * Math.cos(z * 0.019) * 4.2;
  const detail = Math.sin(x * 0.071 + z * 0.045) * Math.cos(z * 0.084) * 1.15;
  const basin = -3.8 * Math.exp(-((x + 12) ** 2 + (z - 14) ** 2) / 2600);
  return ridges + detail + basin;
}

function boulder(scene: THREE.Scene, x: number, z: number, radius: number, material: THREE.Material): void {
  const mesh = new THREE.Mesh(new THREE.IcosahedronGeometry(radius, 1), material);
  mesh.position.set(x, terrainHeight(x, z) + radius * .38, z);
  mesh.rotation.set(x * .11, z * .06, x * .03);
  mesh.scale.set(1, .72 + ((x + z) % 7) * .03, .8);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  scene.add(mesh);
}

export function createHabitat(scene: THREE.Scene): Habitat {
  const geometry = new THREE.PlaneGeometry(WORLD_RADIUS * 2, WORLD_RADIUS * 2, 160, 160);
  geometry.rotateX(-Math.PI / 2);
  const positions = geometry.attributes.position;
  for (let i = 0; i < positions.count; i++) {
    positions.setY(i, terrainHeight(positions.getX(i), positions.getZ(i)));
  }
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  const ground = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: 0x53645d, roughness: .98, flatShading: false }));
  ground.receiveShadow = true;
  scene.add(ground);

  const stone = new THREE.MeshStandardMaterial({ color: 0x43565b, roughness: .92, metalness: .06, flatShading: true });
  for (let i = 0; i < 75; i++) {
    const angle = i * 2.39996;
    const distance = 20 + Math.sqrt(i / 75) * 130;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    boulder(scene, x, z, 1.8 + (i % 9) * .5, stone);
  }

  const shipPosition = new THREE.Vector3(-12, terrainHeight(-12, 14), 14);
  const hull = new THREE.Mesh(new THREE.CapsuleGeometry(3, 8, 8, 16), new THREE.MeshStandardMaterial({ color: 0x9aa5a0, metalness: .72, roughness: .34 }));
  hull.rotation.z = Math.PI / 2;
  hull.rotation.y = -.32;
  hull.position.copy(shipPosition).add(new THREE.Vector3(0, 2.4, 0));
  hull.castShadow = true;
  scene.add(hull);
  const cockpit = new THREE.Mesh(new THREE.SphereGeometry(2.35, 20, 12), new THREE.MeshPhysicalMaterial({ color: 0x162e38, metalness: .42, roughness: .18, transmission: .14 }));
  cockpit.position.copy(shipPosition).add(new THREE.Vector3(5.7, 2.65, 0));
  cockpit.scale.set(.8, .55, 1);
  cockpit.castShadow = true;
  scene.add(cockpit);

  const nestPosition = new THREE.Vector3(58, terrainHeight(58, -42), -42);
  const nest = new THREE.Mesh(new THREE.TorusGeometry(5, 1.1, 10, 30), new THREE.MeshStandardMaterial({ color: 0x352f47, roughness: 1 }));
  nest.rotation.x = Math.PI / 2;
  nest.position.copy(nestPosition).add(new THREE.Vector3(0, .6, 0));
  nest.castShadow = true;
  scene.add(nest);
  for (let i = 0; i < 5; i++) {
    const egg = new THREE.Mesh(new THREE.SphereGeometry(.9, 16, 12), new THREE.MeshStandardMaterial({ color: 0x8b9fb1, emissive: 0x142c45, emissiveIntensity: .5, roughness: .28 }));
    egg.scale.set(.75, 1.45, .78);
    egg.position.set(nestPosition.x + Math.cos(i * 2.4) * 2.2, nestPosition.y + 1.2, nestPosition.z + Math.sin(i * 2.4) * 2.2);
    egg.castShadow = true;
    scene.add(egg);
  }

  const componentPosition = new THREE.Vector3(76, terrainHeight(76, -29), -29);
  return { heightAt: terrainHeight, shipPosition, nestPosition, componentPosition };
}
