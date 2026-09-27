import * as THREE from 'three';
import type { ShipStage } from './model';
import { crashSite } from './geography';

const metal = (color: number, roughness = .42) => new THREE.MeshStandardMaterial({ color, roughness, metalness: .68 });

export function createCrashShip(scene: THREE.Scene): { sync: (stage: ShipStage, elapsed: number) => void } {
  const wreck = new THREE.Group(); wreck.name = 'crash-ship'; wreck.position.set(crashSite.ship.x, 0, crashSite.ship.z); wreck.rotation.x = .055; wreck.rotation.z = -.06; scene.add(wreck);
  const shell = metal(0xa5b5b3), dark = metal(0x334b52), trim = metal(0x6e898d);
  const wingMetal = metal(0xb1c2c0); wingMetal.side = THREE.DoubleSide;
  const glass = new THREE.MeshStandardMaterial({ color: 0x173947, roughness: .12, metalness: .48 });
  const scorch = new THREE.MeshStandardMaterial({ color: 0x272c2b, roughness: .98, side: THREE.DoubleSide });
  const amber = new THREE.MeshStandardMaterial({ color: 0xf1a45c, emissive: 0xc65d2b, emissiveIntensity: 1.5 });
  const add = (geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number, name?: string) => {
    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true;
    if (name) mesh.name = name;
    wreck.add(mesh); return mesh;
  };
  const box = (x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material, name?: string) =>
    add(new THREE.BoxGeometry(w, h, d), material, x, y, z, name);

  const hull = add(new THREE.CylinderGeometry(1.5, 2.05, 10.6, 16), shell, 0, 2.45, 0, 'ship-fuselage');
  hull.rotation.x = Math.PI / 2;
  const nose = add(new THREE.ConeGeometry(1.5, 3.6, 16), shell, 0, 2.45, 6.4, 'ship-nose');
  nose.rotation.x = Math.PI / 2;
  const canopy = add(new THREE.SphereGeometry(1, 20, 12), glass, 0, 3.65, 2.65, 'ship-canopy');
  canopy.scale.set(1.12, .57, 2.35);
  box(0, 3.3, 1.4, 2.45, .13, 3.7, trim);
  for (const side of [-1, 1]) {
    const shape = new THREE.Shape();
    shape.moveTo(side * 1.4, 1.5);
    shape.lineTo(side * 8, -2.4);
    shape.lineTo(side * 7.5, -4.1);
    shape.lineTo(side * 1.6, -3.5);
    shape.closePath();
    const wing = add(new THREE.ExtrudeGeometry(shape, { depth: .22, bevelEnabled: false }), wingMetal, 0, 2.2, 0, `ship-wing-${side}`);
    wing.rotation.x = Math.PI / 2;
    box(side * 5.7, 1.7, -3.2, 3.1, .13, .36, dark);
    const fin = box(side * 1.55, 3.15, -4.5, .22, 2.1, 2.5, trim);
    fin.rotation.z = side * -.2;
    const engine = add(new THREE.CylinderGeometry(.58, .78, 2.2, 12), dark, side * 1.12, 2.0, -5.7, `ship-engine-${side}`);
    engine.rotation.x = Math.PI / 2;
    const nozzle = add(new THREE.TorusGeometry(.55, .14, 8, 20), metal(0x667b7c), side * 1.12, 2.0, -6.83);
    nozzle.rotation.y = Math.PI / 2;
    box(side * 1.5, .5, -1.7, .3, .7, 4.2, dark);
  }
  const hatch = box(2.06, 2.03, 3.55, .13, 2.0, 1.8, dark, 'ship-hatch');
  hatch.rotation.y = -.16;
  box(2.15, 1.98, 3.5, .16, 1.65, 1.45, glass);
  const ramp = box(2.25, .42, 7.35, 2.35, .18, 5.2, trim, 'ship-ramp');
  ramp.rotation.x = -.08;
  for (let i = 0; i < 5; i++) box(2.25, .54, 5.3 + i * .9, 2.28, .035, .13, dark);
  box(2.25, 1.42, 5.0, 2.4, .11, .12, amber);

  const burn = add(new THREE.SphereGeometry(1, 12, 8), scorch, -4.2, 1.96, -1.6, 'ship-impact-scorch');
  burn.scale.set(2.2, .04, 1.15);
  burn.rotation.y = -.34;
  const brokenPanel = box(-5.4, 2.03, -2.2, 1.8, .1, .85, dark, 'ship-broken-panel');
  brokenPanel.rotation.y = .35; brokenPanel.rotation.z = -.17;
  for (const x of [-7.1, 7.1]) {
    const light = add(new THREE.SphereGeometry(.16, 8, 6), amber, x, 1.88, -2.7, 'ship-hazard-light');
    light.castShadow = false;
  }

  // The repair terminal stays at the established interaction point.
  box(-5, .95, 7, 1.25, 1.9, .7, dark, 'ship-repair-console');
  box(-5, 1.28, 6.6, 1.04, .72, .06, glass);
  for (let i = 0; i < 3; i++) box(-5.33 + i * .33, 1.34, 6.56, .16, .05, .03, amber);
  box(-3.4, .12, 4.3, .13, .2, 4.7, dark);

  const beacon = new THREE.Group(); beacon.name = 'cloaked-ship-beacon'; beacon.position.set(crashSite.cloak.x, 0, crashSite.cloak.z); scene.add(beacon);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(.78, .055, 6, 28), new THREE.MeshBasicMaterial({ color: 0x83e9df }));
  ring.rotation.x = Math.PI / 2; ring.position.y = .08; beacon.add(ring);
  const beam = new THREE.Mesh(new THREE.CylinderGeometry(.04, .04, 1.7, 6), new THREE.MeshBasicMaterial({ color: 0x89dacf, transparent: true, opacity: .55 }));
  beam.position.y = .95; beacon.add(beam);
  const cap = new THREE.Mesh(new THREE.OctahedronGeometry(.2), new THREE.MeshBasicMaterial({ color: 0xc7f4e4 }));
  cap.position.y = 1.9; beacon.add(cap);

  const sync = (stage: ShipStage, elapsed: number) => {
    wreck.visible = stage === 'outside';
    beacon.visible = stage === 'hidden';
    cap.rotation.y = elapsed * .7;
    amber.emissiveIntensity = 1.15 + Math.sin(elapsed * 3.4) * .4;
  };
  sync('outside', 0);
  return { sync };
}
