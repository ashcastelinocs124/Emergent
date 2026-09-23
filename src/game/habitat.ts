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
  const colors: number[] = [];
  for (let i = 0; i < positions.count; i++) {
    const x = positions.getX(i);
    const z = positions.getZ(i);
    const height = terrainHeight(x, z);
    positions.setY(i, height);
    const grain = Math.sin(x * .21 + z * .13) * Math.sin(z * .17 - x * .08);
    const color = new THREE.Color(height > 2 ? 0x69706a : height < -3 ? 0x405a5b : 0x4d625b);
    color.offsetHSL(.013 * grain, 0, .048 * grain);
    colors.push(color.r, color.g, color.b);
  }
  geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  positions.needsUpdate = true;
  geometry.computeVertexNormals();
  const ground = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ vertexColors: true, roughness: .98, flatShading: false }));
  ground.receiveShadow = true;
  scene.add(ground);

  const stone = new THREE.MeshStandardMaterial({ color: 0x43565b, roughness: .92, metalness: .06, flatShading: true });
  for (let i = 0; i < 75; i++) {
    const angle = i * 2.39996;
    const distance = 20 + Math.sqrt(i / 75) * 130;
    const x = Math.cos(angle) * distance;
    const z = Math.sin(angle) * distance;
    boulder(scene, x, z, 1.2 + (i % 9) * .24, stone);
  }

  const reedGeometry = new THREE.ConeGeometry(.32, 3.5, 5);
  const reedMaterial = new THREE.MeshStandardMaterial({ color: 0x647e72, side: THREE.DoubleSide, roughness: .86 });
  const reeds = new THREE.InstancedMesh(reedGeometry, reedMaterial, 1250);
  const matrix = new THREE.Matrix4();
  const rotation = new THREE.Quaternion();
  const scale = new THREE.Vector3();
  const position = new THREE.Vector3();
  for (let i = 0; i < reeds.count; i++) {
    const angle = i * 2.399963;
    const radius = 8 + Math.sqrt(i / reeds.count) * 127;
    const x = Math.cos(angle) * radius + Math.sin(i * 12.81) * 2;
    const z = Math.sin(angle) * radius + Math.cos(i * 9.73) * 2;
    const size = .35 + (Math.sin(i * 28.12) + 1) * .5;
    position.set(x, terrainHeight(x, z) + size * .85, z);
    rotation.setFromAxisAngle(new THREE.Vector3(0, 0, 1), Math.sin(i * 8.3) * .15);
    scale.set(size * .8, size, size * .8);
    matrix.compose(position, rotation, scale);
    reeds.setMatrixAt(i, matrix);
    reeds.setColorAt(i, new THREE.Color(i % 7 === 0 ? 0x8ba69a : 0x526d64));
  }
  reeds.instanceMatrix.needsUpdate = true;
  reeds.receiveShadow = true;
  scene.add(reeds);

  const fungiStem = new THREE.CylinderGeometry(.18, .3, 2.4, 7);
  const fungiCap = new THREE.SphereGeometry(1.2, 10, 6);
  const stemMaterial = new THREE.MeshStandardMaterial({ color: 0x324950, roughness: .72 });
  const capMaterial = new THREE.MeshStandardMaterial({ color: 0x6ca7a4, emissive: 0x285154, emissiveIntensity: .7, roughness: .52 });
  for (let i = 0; i < 70; i++) {
    const angle = i * 2.399963;
    const radius = 16 + Math.sqrt(i / 70) * 105;
    const x = Math.cos(angle) * radius;
    const z = Math.sin(angle) * radius;
    const height = terrainHeight(x, z);
    const s = .45 + (Math.sin(i * 14.7) + 1) * .55;
    const stem = new THREE.Mesh(fungiStem, stemMaterial);
    stem.position.set(x, height + 1.2 * s, z);
    stem.scale.set(s, s, s);
    const cap = new THREE.Mesh(fungiCap, capMaterial);
    cap.position.set(x, height + 2.2 * s, z);
    cap.scale.set(s * 1.35, s * .24, s * 1.35);
    stem.castShadow = cap.castShadow = i % 4 === 0;
    scene.add(stem, cap);
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
  const landingRing = new THREE.Mesh(new THREE.TorusGeometry(9, .19, 8, 64), new THREE.MeshStandardMaterial({ color: 0x9eb5a9, metalness: .78, roughness: .38 }));
  landingRing.rotation.x = Math.PI / 2;
  landingRing.position.copy(shipPosition).add(new THREE.Vector3(0, .18, 0));
  scene.add(landingRing);
  const shipBeacon = new THREE.PointLight(0x9ec8c4, 5, 24, 2);
  shipBeacon.position.copy(shipPosition).add(new THREE.Vector3(2, 3, 1));
  scene.add(shipBeacon);
  const consolePedestal = new THREE.Mesh(new THREE.BoxGeometry(1.3, 1.8, .8), new THREE.MeshStandardMaterial({ color: 0x37494c, metalness: .75, roughness: .43 }));
  consolePedestal.position.copy(shipPosition).add(new THREE.Vector3(2, 1, 0));
  consolePedestal.castShadow = true;
  scene.add(consolePedestal);
  const consoleScreen = new THREE.Mesh(new THREE.PlaneGeometry(.95, .58), new THREE.MeshBasicMaterial({ color: 0x8dc8bb, side: THREE.DoubleSide }));
  consoleScreen.position.copy(shipPosition).add(new THREE.Vector3(2, 1.75, .42));
  consoleScreen.rotation.x = -.4;
  scene.add(consoleScreen);

  const nestPosition = new THREE.Vector3(58, terrainHeight(58, -42), -42);
  const nest = new THREE.Mesh(new THREE.TorusGeometry(5, 1.1, 10, 30), new THREE.MeshStandardMaterial({ color: 0x352f47, roughness: 1 }));
  nest.rotation.x = Math.PI / 2;
  nest.position.copy(nestPosition).add(new THREE.Vector3(0, .6, 0));
  nest.castShadow = true;
  scene.add(nest);
  const nestLight = new THREE.PointLight(0x975fc5, 7, 19, 2);
  nestLight.position.copy(nestPosition).add(new THREE.Vector3(0, 3.5, 0));
  scene.add(nestLight);

  const componentPosition = new THREE.Vector3(76, terrainHeight(76, -29), -29);
  const wreck = new THREE.Mesh(new THREE.BoxGeometry(4, 1.3, 3), new THREE.MeshStandardMaterial({ color: 0x36494c, metalness: .77, roughness: .52 }));
  wreck.position.copy(componentPosition).add(new THREE.Vector3(0, .5, 0));
  wreck.rotation.y = .63;
  wreck.castShadow = true;
  scene.add(wreck);
  return { heightAt: terrainHeight, shipPosition, nestPosition, componentPosition };
}
