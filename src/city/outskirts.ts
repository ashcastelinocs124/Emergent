import * as THREE from 'three';
import { crashSite } from './geography';

const material = (color: number, roughness = .9) => new THREE.MeshStandardMaterial({ color, roughness });

export function createCrashOutskirts(scene: THREE.Scene): void {
  const outskirts = new THREE.Group(); outskirts.name = 'crash-outskirts'; scene.add(outskirts);
  const earth = material(0x526356), road = material(0x323b3b), shoulder = material(0x786f5e);
  const iron = material(0x526267, .5), warning = new THREE.MeshBasicMaterial({ color: 0xf2b568 });
  const add = (geometry: THREE.BufferGeometry, surface: THREE.Material, x: number, y: number, z: number, name?: string) => {
    const mesh = new THREE.Mesh(geometry, surface);
    mesh.position.set(x, y, z); mesh.receiveShadow = true; mesh.castShadow = y > 1;
    if (name) mesh.name = name;
    outskirts.add(mesh); return mesh;
  };
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, surface: THREE.Material, name?: string) =>
    add(new THREE.BoxGeometry(w, h, d), surface, x, y, z, name);

  box(0, -.48, -320, 260, .8, 550, earth, 'outskirts-ground');
  box(0, -.055, -315, 21, .09, 525, shoulder, 'city-approach-shoulder');
  box(0, -.009, -315, 14, .08, 525, road, 'city-approach-road');
  for (let z = -570; z < -68; z += 11) box(0, .043, z, .18, .012, 4, material(0xd0c9aa));
  for (const side of [-1, 1]) {
    box(side * 7.1, .04, -315, .17, .018, 515, material(0xa6a58e));
    for (let z = -560; z < -82; z += 16) {
      box(side * 11.5, .58, z, .17, 1.12, .17, iron);
      if (z > -145) box(side * 11.5, .78, z + 8, .07, .07, 16, iron);
    }
  }

  const impact = add(new THREE.CircleGeometry(18, 32), material(0x282d2a), crashSite.ship.x, .03, crashSite.ship.z, 'impact-scar');
  impact.rotation.x = -Math.PI / 2;
  const outerScar = add(new THREE.RingGeometry(18, 23, 32), material(0x695848), crashSite.ship.x, .025, crashSite.ship.z);
  outerScar.rotation.x = -Math.PI / 2;
  for (let i = 0; i < 16; i++) {
    const angle = i * 2.399, distance = 20 + i % 4 * 2.5;
    const x = crashSite.ship.x + Math.cos(angle) * distance, z = crashSite.ship.z + Math.sin(angle) * distance;
    const debris = box(x, .12, z, .7 + i % 3 * .35, .25, .35 + i % 2 * .3, i % 4 ? iron : material(0x252d30), 'crash-debris');
    debris.rotation.y = angle;
  }

  const foliage = [0x4f6754, 0x617353, 0x3c574c].map(color => material(color));
  for (let i = 0; i < 110; i++) {
    const z = -580 + i * 4.5, side = i % 2 ? -1 : 1;
    const x = side * (19 + (i * 17 % 33));
    if (Math.hypot(x - crashSite.ship.x, z - crashSite.ship.z) < 23) continue;
    if (x > -35 && x < -7 && z > -165 && z < -90) continue;
    const trunk = add(new THREE.CylinderGeometry(.13, .23, 2.8 + i % 3, 5), material(0x51483e), x, 1.4, z);
    trunk.rotation.z = (i % 5 - 2) * .03;
    const crown = add(new THREE.ConeGeometry(1.8 + i % 4 * .3, 5 + i % 3, 6), foliage[i % foliage.length], x, 4.8 + i % 3 * .4, z);
    crown.rotation.y = i * .7;
  }

  for (const side of [-1, 1]) {
    box(side * 11, 3.2, -78, .42, 6.4, .42, iron, 'city-gate-post');
    box(side * 11, 6.35, -78, 1.6, .25, 1.6, warning);
  }
  box(0, 6.25, -78, 22, .38, .38, iron, 'city-gate-arch');
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 1024; canvas.height = 192;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#26393c'; context.fillRect(0, 0, 1024, 192);
      context.fillStyle = '#b9e4d7'; context.font = 'bold 67px Arial'; context.textAlign = 'center';
      context.fillText('NEW EDEN  /  CITY LIMITS', 512, 123);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const sign = add(new THREE.PlaneGeometry(11, 2.06), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }), 0, 5.15, -78, 'city-limits-sign');
      sign.rotation.y = Math.PI;
    }
  }
  box(17, 2, -135, .18, 4, .18, iron);
  box(17, 3.35, -135, 5, 1.1, .2, material(0x384f52), 'city-direction-sign');
  box(17, 2.8, -135.13, 4.2, .1, .05, warning);
  if (typeof document !== 'undefined') {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 128;
    const context = canvas.getContext('2d');
    if (context) {
      context.fillStyle = '#334e52'; context.fillRect(0, 0, 512, 128);
      context.fillStyle = '#e3f3e9'; context.font = 'bold 48px Arial'; context.textAlign = 'center';
      context.fillText('NEW EDEN  ↑', 256, 58);
      context.font = '25px Arial'; context.fillText('CITY ENTRANCE · 0.1 KM', 256, 103);
      const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
      const sign = add(new THREE.PlaneGeometry(4.85, 1.2), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }), 17, 3.35, -135.13);
      sign.rotation.y = Math.PI;
    }
  }
}
