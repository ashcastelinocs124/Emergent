import * as THREE from 'three';
import { residentIds, residents, materialIds, materials } from './content';
import { createAmbientCrowd } from './crowd';
import { createGroundTraffic } from './ground-traffic';
import { createServiceRobots } from './robots';
import type { CityState, MaterialId, ResidentId } from './model';
const fabrics = new Map<number, THREE.MeshStandardMaterial>();
const fabric = (color: number) => {
  let material = fabrics.get(color);
  if (!material) { material = new THREE.MeshStandardMaterial({ color, roughness: .91 }); fabrics.set(color, material); }
  return material;
};
type PersonProfile = { coat: number; trousers: number; skin: number; hair: number; height?: number; role?: ResidentId };
type PersonRig = { group: THREE.Group; head: THREE.Group; arms: [THREE.Group, THREE.Group]; legs: [THREE.Group, THREE.Group] };
function human(profile: PersonProfile, detailed = false): PersonRig {
  const group = new THREE.Group();
  const skin = fabric(profile.skin), coat = fabric(profile.coat), trousers = fabric(profile.trousers), hair = fabric(profile.hair), shoes = fabric(0x252a2b);
  const part = (parent: THREE.Object3D, geometry: THREE.BufferGeometry, material: THREE.Material, x: number, y: number, z: number) => {
    const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x, y, z); mesh.castShadow = detailed; parent.add(mesh); return mesh;
  };
  // Human-scale anatomy, with joints that move around the shoulder and hip rather than floating whole limbs.
  part(group, new THREE.CylinderGeometry(.255, .19, .59, 12), coat, 0, 1.17, 0);
  part(group, new THREE.CylinderGeometry(.19, .205, .18, 10), trousers, 0, .82, 0);
  if (detailed) part(group, new THREE.CylinderGeometry(.067, .076, .14, 10), skin, 0, 1.54, 0);
  const head = new THREE.Group(); head.position.set(0, 1.67, 0); group.add(head);
  const face = part(head, new THREE.SphereGeometry(1, 16, 12), skin, 0, 0, 0); face.scale.set(.13, .17, .116);
  const hairCap = part(head, new THREE.SphereGeometry(1, 16, 10, 0, Math.PI * 2, 0, Math.PI * .47), hair, 0, .028, -.008); hairCap.scale.set(.137, .175, .126);
  const arms: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];
  const legs: [THREE.Group, THREE.Group] = [new THREE.Group(), new THREE.Group()];
  for (const [i, side] of ([-1, 1] as const).entries()) {
    const arm = arms[i]; arm.position.set(side * .27, 1.43, 0); group.add(arm);
    if (detailed) {
      part(arm, new THREE.CylinderGeometry(.082, .066, .32, 9), coat, side * .015, -.17, 0);
      part(arm, new THREE.CylinderGeometry(.065, .052, .29, 9), coat, side * .025, -.47, .015);
      part(arm, new THREE.SphereGeometry(.055, 8, 6), skin, side * .028, -.64, .02);
    } else part(arm, new THREE.CylinderGeometry(.076, .051, .6, 8), coat, side * .02, -.31, 0);
    arm.rotation.z = side * .075;
    const leg = legs[i]; leg.position.set(side * .115, .84, 0); group.add(leg);
    if (detailed) {
      part(leg, new THREE.CylinderGeometry(.107, .078, .37, 10), trousers, 0, -.2, 0);
      part(leg, new THREE.CylinderGeometry(.079, .052, .32, 10), trousers, 0, -.54, .018);
    } else part(leg, new THREE.CylinderGeometry(.1, .055, .69, 8), trousers, 0, -.37, 0);
    const shoe = part(leg, new THREE.BoxGeometry(.16, .11, .28), shoes, 0, -.76, .075); shoe.rotation.x = -.07;
  }
  if (detailed) {
    const eyeWhite = fabric(0xd6d5ca), iris = fabric(0x282523), lip = fabric(0x754d44);
    for (const side of [-1, 1]) {
      const eye = part(head, new THREE.SphereGeometry(.021, 8, 6), eyeWhite, side * .054, .007, .108); eye.scale.y = .55;
      part(head, new THREE.SphereGeometry(.009, 8, 6), iris, side * .054, .008, .127);
      const brow = part(head, new THREE.BoxGeometry(.052, .009, .012), hair, side * .056, .048, .112); brow.rotation.z = side * -.08;
      part(head, new THREE.SphereGeometry(.03, 8, 6), skin, side * .126, -.018, 0);
    }
    part(head, new THREE.ConeGeometry(.025, .075, 8), skin, 0, -.035, .117).rotation.x = Math.PI / 2;
    part(head, new THREE.BoxGeometry(.055, .007, .008), lip, 0, -.103, .099);
    const dark = fabric(0x282f30);
    if (profile.role === 'mara' || profile.role === 'sora') {
      const apron = part(group, new THREE.BoxGeometry(.34, .49, .018), dark, 0, 1.05, .15);
      apron.rotation.x = -.06;
      part(group, new THREE.BoxGeometry(.34, .025, .026), fabric(0x786957), 0, 1.42, .16);
    }
    if (profile.role === 'eli') {
      const strap = part(group, new THREE.BoxGeometry(.045, .62, .025), dark, -.04, 1.19, .22); strap.rotation.z = -.45;
      part(group, new THREE.BoxGeometry(.25, .27, .12), dark, .26, .9, -.03);
    }
    if (profile.role === 'dev') {
      const strip = fabric(0xb5b7a4);
      part(group, new THREE.BoxGeometry(.42, .025, .018), strip, 0, 1.33, .215);
      part(group, new THREE.BoxGeometry(.42, .025, .018), strip, 0, 1.03, .19);
    }
  }
  group.scale.setScalar(profile.height ?? 1);
  return { group, head, arms, legs };
}
function pose(rig: PersonRig, phase: number, moving: boolean, talking = false): void {
  const stride = moving ? Math.sin(phase) * .38 : 0;
  rig.legs[0].rotation.x = stride; rig.legs[1].rotation.x = -stride;
  rig.arms[0].rotation.x = -stride * .7 + (talking ? -.16 + Math.sin(phase * .35) * .06 : 0);
  rig.arms[1].rotation.x = stride * .7 + (talking ? -.1 + Math.sin(phase * .43) * .05 : 0);
  rig.head.rotation.y = talking ? Math.sin(phase * .23) * .055 : Math.sin(phase * .12) * .08;
  rig.head.rotation.z = talking ? Math.sin(phase * .31) * .025 : 0;
}
function nameTag(name: string): THREE.Sprite | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96; const ctx = canvas.getContext('2d'); if (!ctx) return null;
  ctx.fillStyle = '#102b34df'; ctx.fillRect(0, 0, 512, 96); ctx.strokeStyle = '#c5e0c2'; ctx.lineWidth = 3; ctx.strokeRect(3, 3, 506, 90);
  ctx.fillStyle = '#f1f5dc'; ctx.font = 'bold 42px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name.toUpperCase(), 256, 49);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: true, transparent: true })); sprite.position.y = 2.85; sprite.scale.set(1.9, .36, 1); return sprite;
}
export function createResidentViews(scene: THREE.Scene) {
  const ambientCrowd = createAmbientCrowd(scene);
  const groundTraffic = createGroundTraffic(scene);
  const serviceRobots = createServiceRobots(scene);
  const profiles: Record<ResidentId, PersonProfile> = {
    mara: { coat: 0x595a4a, trousers: 0x353a3a, skin: 0xb78d72, hair: 0x292421, height: 1.02, role: 'mara' },
    eli: { coat: 0x45596a, trousers: 0x303947, skin: 0x91634e, hair: 0x211e20, height: 1.03, role: 'eli' },
    sora: { coat: 0x865b47, trousers: 0x3c3431, skin: 0x9c6b58, hair: 0x241e1b, height: .99, role: 'sora' },
    dev: { coat: 0x41636a, trousers: 0x293f43, skin: 0xa47d62, hair: 0x3c3d39, height: 1.06, role: 'dev' },
  };
  const views = Object.fromEntries(residentIds.map(id => {
    const rig = human(profiles[id], true); const tag = nameTag(residents[id].name); if (tag) { tag.position.y = 2.18; rig.group.add(tag); }
    rig.group.position.set(residents[id].x, 0, residents[id].z); scene.add(rig.group); return [id, rig];
  })) as Record<ResidentId, PersonRig>;
  const pedestrians: { rig: PersonRig; direction: number; speed: number; waitingUntil: number }[] = [];
  for (let i = 0; i < 24; i++) {
    const side = i % 2 ? -1 : 1;
    const rig = human({ coat: [0x5f6872, 0x746456, 0x63746a, 0x886e68, 0x5d5f72][i % 5], trousers: [0x303839, 0x41413f, 0x2c343b][i % 3], skin: [0x704d3e, 0xb58a6e, 0xc5a389, 0x8e624d][i % 4], hair: [0x251f1b, 0x34332f, 0x4a4135][i % 3], height: .93 + (i % 5) * .025 });
    rig.group.position.set(side * (12.7 + (i % 3) * .35), 0, -56 + i * 4.75);
    scene.add(rig.group); pedestrians.push({ rig, direction: i % 4 < 2 ? 1 : -1, speed: 1.2 + (i % 4) * .15, waitingUntil: 0 });
  }
  let previousElapsed = 0;
  return { sync(state: CityState, elapsed: number, speakingTo: ResidentId | null = null) {
    const dt = Math.min(Math.max(elapsed - previousElapsed, 0), .1); previousElapsed = elapsed;
    for (const id of residentIds) {
      const current = state.residents[id], rig = views[id], view = rig.group;
      const base = residents[id];
      const walkPhase = elapsed * .5 + residentIds.indexOf(id);
      const moving = current.activity === 'walk' && speakingTo !== id && Math.abs(Math.cos(walkPhase)) > .14;
      const offset = current.activity === 'walk' ? Math.sin(walkPhase) * 2.4 : current.activity === 'watch' ? .65 : 0;
      if (speakingTo !== id) {
        view.position.x += (base.x + offset - view.position.x) * Math.min(1, dt * 2.5);
        view.position.z = base.z;
      }
      view.rotation.y = speakingTo === id ? Math.atan2(state.player.x - view.position.x, state.player.z - view.position.z) : moving ? (Math.cos(walkPhase) < 0 ? -Math.PI / 2 : Math.PI / 2) : current.activity === 'work' ? -.45 : Math.sin(elapsed * .12 + residentIds.indexOf(id)) * .3;
      const tag = view.children.find(child => child instanceof THREE.Sprite); if (tag) tag.visible = speakingTo !== id && Math.hypot(state.player.x - view.position.x, state.player.z - view.position.z) < 8;
      pose(rig, elapsed * 6 + residentIds.indexOf(id), moving, speakingTo === id);
      if (current.activity === 'work' && speakingTo !== id) rig.arms[1].rotation.x = -.35 + Math.sin(elapsed * 2.2) * .13;
      current.position = { x: view.position.x, z: view.position.z };
    }
    pedestrians.forEach((person, index) => {
      const { rig } = person; const moving = elapsed >= person.waitingUntil;
      if (moving) {
        rig.group.position.z += person.direction * person.speed * dt;
        if (Math.abs(rig.group.position.z) > 57) { rig.group.position.z = Math.sign(rig.group.position.z) * 57; person.direction *= -1; person.waitingUntil = elapsed + 1.2 + index % 3; }
        if (Math.abs(rig.group.position.z - (index % 2 ? 33 : -31)) < .02 && Math.floor(elapsed) % 17 === index % 17) person.waitingUntil = elapsed + 1.5;
      }
      rig.group.rotation.y = person.direction > 0 ? 0 : Math.PI;
      pose(rig, elapsed * (4.5 + person.speed) + index, moving);
    });
    ambientCrowd.sync(elapsed, state.player);
    serviceRobots.sync(elapsed, state.player);
    groundTraffic.sync(elapsed, state.player);
  }, dispose() { Object.values(views).forEach(rig => scene.remove(rig.group)); pedestrians.forEach(person => scene.remove(person.rig.group)); ambientCrowd.dispose(); serviceRobots.dispose(); groundTraffic.dispose(); } };
}
export function createMaterialViews(scene: THREE.Scene) {
  const views = Object.fromEntries(materialIds.map(id => {
    const material = materials[id]; const group = new THREE.Group(); group.position.set(material.x, 0, material.z);
    const metal = new THREE.MeshStandardMaterial({ color: id === 'power-cell' ? 0x7192a0 : id === 'thermal-shield' ? 0xb99262 : 0x708f8b, metalness: .75, roughness: .25 });
    const mesh = new THREE.Mesh(id === 'thermal-shield' ? new THREE.BoxGeometry(1.8, .32, 1.3) : new THREE.CylinderGeometry(.4, .45, 1.2, 10), metal);
    mesh.position.y = .85; mesh.castShadow = true; group.add(mesh);
    const lamp = new THREE.Mesh(new THREE.SphereGeometry(.12, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffbf75 })); lamp.position.y = 1.62; group.add(lamp);
    scene.add(group); return [id, group];
  })) as Record<MaterialId, THREE.Group>;
  return { sync(state: CityState, elapsed: number) { for (const id of materialIds) { views[id].visible = !state.inventory.includes(id) && !state.installed.includes(id); views[id].rotation.y = Math.sin(elapsed * .7) * .12; } } };
}
