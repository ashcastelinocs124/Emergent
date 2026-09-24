import * as THREE from 'three';
import { residentIds, residents, materialIds, materials } from './content';
import type { CityState, MaterialId, ResidentId } from './model';
const fabric = (color: number) => new THREE.MeshStandardMaterial({ color, roughness: .94 });
function human(color: number): THREE.Group {
  const group = new THREE.Group();
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(.38, .8, 5, 8), fabric(color)); body.position.y = 1.3; group.add(body);
  const head = new THREE.Mesh(new THREE.SphereGeometry(.25, 12, 8), fabric(0xb88768)); head.position.y = 2.17; group.add(head);
  const hair = new THREE.Mesh(new THREE.SphereGeometry(.26, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2), fabric(0x2a302e)); hair.position.y = 2.23; group.add(hair);
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(.1, .6, 4, 6), fabric(color)); arm.position.set(side * .49, 1.32, 0); arm.rotation.z = side * .12; group.add(arm);
    const leg = new THREE.Mesh(new THREE.CapsuleGeometry(.13, .7, 4, 6), fabric(0x303b41)); leg.position.set(side * .2, .52, 0); group.add(leg);
  }
  return group;
}
function nameTag(name: string): THREE.Sprite | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96; const ctx = canvas.getContext('2d'); if (!ctx) return null;
  ctx.fillStyle = '#102b34df'; ctx.fillRect(0, 0, 512, 96); ctx.strokeStyle = '#c5e0c2'; ctx.lineWidth = 3; ctx.strokeRect(3, 3, 506, 90);
  ctx.fillStyle = '#f1f5dc'; ctx.font = 'bold 42px Arial'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText(name.toUpperCase(), 256, 49);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: texture, depthTest: true, transparent: true })); sprite.position.y = 3.1; sprite.scale.set(3.2, .6, 1); return sprite;
}
export function createResidentViews(scene: THREE.Scene) {
  const views = Object.fromEntries(residentIds.map(id => { const view = human(residents[id].color); const tag = nameTag(residents[id].name); if (tag) view.add(tag);
    const accent = new THREE.Mesh(new THREE.BoxGeometry(id === 'eli' ? .43 : .58, id === 'sora' ? .7 : .15, .18), fabric(id === 'dev' ? 0xd4b25d : 0x38464a));
    accent.position.set(id === 'eli' ? .48 : 0, id === 'sora' ? 1.4 : .95, .35); view.add(accent); view.position.set(residents[id].x, 0, residents[id].z); scene.add(view); return [id, view]; })) as Record<ResidentId, THREE.Group>;
  const pedestrians: THREE.Group[] = [];
  for (let i = 0; i < 30; i++) {
    const view = human([0x6e8790, 0x877c6b, 0x668977, 0x9b8178][i % 4]); view.scale.setScalar(.8 + (i % 3) * .08);
    view.position.set((i % 2 ? -1 : 1) * (11 + i % 4), 0, -55 + i * 3.5); scene.add(view); pedestrians.push(view);
  }
  const cars: { group: THREE.Group; direction: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const group = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(2, .9, 3.7), fabric([0x4a7180, 0x9a715d, 0x6f8179, 0x6c6d7c][i])); body.position.y = .8; group.add(body);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.85, .5, 1.6), fabric(0x294650)); glass.position.set(0, 1.4, -.2); group.add(glass);
    for (const side of [-1, 1]) for (const z of [-1.2, 1.2]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .2, 10), fabric(0x20272a)); wheel.rotation.z = Math.PI / 2; wheel.position.set(side * 1, .35, z); group.add(wheel); }
    group.position.set(i % 2 ? 3.5 : -3.5, 0, -12 + i * 22); scene.add(group); cars.push({ group, direction: i % 2 ? -1 : 1 });
  }
  return { sync(state: CityState, elapsed: number) {
    for (const id of residentIds) {
      const current = state.residents[id], view = views[id];
      const base = residents[id];
      const offset = current.activity === 'walk' ? Math.sin(elapsed * .35 + residentIds.indexOf(id)) * 3 : current.activity === 'watch' ? 1 : 0;
      const bob = current.activity === 'walk' ? Math.max(0, Math.sin(elapsed * 7 + residentIds.indexOf(id)) * .07) : 0;
      view.position.set(base.x + offset, current.activity === 'rest' ? -.16 : bob, base.z);
      view.rotation.y = current.activity === 'work' ? -.6 : Math.sin(elapsed * .2 + residentIds.indexOf(id));
      const armSwing = current.activity === 'walk' ? Math.sin(elapsed * 7) * .32 : current.activity === 'work' ? -.2 : current.activity === 'watch' ? .12 : 0;
      (view.children[3] as THREE.Mesh).rotation.x = armSwing;
      (view.children[5] as THREE.Mesh).rotation.x = -armSwing;
      current.position = { x: view.position.x, z: view.position.z };
    }
    pedestrians.forEach((view, index) => { view.position.z += Math.sin(index) > 0 ? .015 : -.015; if (view.position.z > 57) view.position.z = -57; if (view.position.z < -57) view.position.z = 57; });
    cars.forEach(({ group, direction }) => { group.position.z += direction * .07; if (group.position.z > 68) group.position.z = -15; if (group.position.z < -15) group.position.z = 68; });
  }, dispose() { Object.values(views).forEach(view => scene.remove(view)); pedestrians.forEach(view => scene.remove(view)); cars.forEach(car => scene.remove(car.group)); } };
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
  const cars: { group: THREE.Group; direction: number }[] = [];
  for (let i = 0; i < 4; i++) {
    const group = new THREE.Group(); const body = new THREE.Mesh(new THREE.BoxGeometry(2, .9, 3.7), fabric([0x4a7180, 0x9a715d, 0x6f8179, 0x6c6d7c][i])); body.position.y = .8; group.add(body);
    const glass = new THREE.Mesh(new THREE.BoxGeometry(1.85, .5, 1.6), fabric(0x294650)); glass.position.set(0, 1.4, -.2); group.add(glass);
    for (const side of [-1, 1]) for (const z of [-1.2, 1.2]) { const wheel = new THREE.Mesh(new THREE.CylinderGeometry(.34, .34, .2, 10), fabric(0x20272a)); wheel.rotation.z = Math.PI / 2; wheel.position.set(side * 1, .35, z); group.add(wheel); }
    group.position.set(i % 2 ? 3.5 : -3.5, 0, -12 + i * 22); scene.add(group); cars.push({ group, direction: i % 2 ? -1 : 1 });
  }
  return { sync(state: CityState, elapsed: number) { for (const id of materialIds) { views[id].visible = !state.inventory.includes(id) && !state.installed.includes(id); views[id].rotation.y = Math.sin(elapsed * .7) * .12; } } };
}
