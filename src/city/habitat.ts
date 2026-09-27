import * as THREE from 'three';
import { materials, materialIds, residents, residentIds } from './content';
import { createUrbanTextures } from './urban-textures';
import { createFlyingTraffic } from './flying-traffic';
import { createCityExpanse } from './expanse';
import { createCrashShip } from './ship';
import { crashSite } from './geography';
import { createCrashOutskirts } from './outskirts';
import type { MaterialId, ResidentId, ShipStage } from './model';
const mat = (color: number, roughness = .85, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const asphalt = mat(0x252e34), concrete = mat(0x848d86), line = mat(0xbdb7a0), darkGlass = mat(0x24434d, .22, .35);
const sillMaterial = mat(0x5a6261);
const cyan = new THREE.MeshBasicMaterial({ color: 0x61d9dc });
const amber = new THREE.MeshBasicMaterial({ color: 0xf5b974 });
function box(scene: THREE.Object3D, x: number, y: number, z: number, w: number, h: number, d: number, material: THREE.Material): THREE.Mesh {
  const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), material);
  mesh.position.set(x, y, z); mesh.receiveShadow = true; mesh.castShadow = h > 2; scene.add(mesh); return mesh;
}
function label(scene: THREE.Object3D, text: string, x: number, y: number, z: number, color = '#e9d5a6'): void {
  if (typeof document === 'undefined') return;
  const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 96;
  const context = canvas.getContext('2d'); if (!context) return;
  context.fillStyle = '#172a32'; context.fillRect(0, 0, 512, 96);
  context.strokeStyle = color; context.lineWidth = 5; context.strokeRect(5, 5, 502, 86);
  context.fillStyle = color; context.font = 'bold 46px Arial'; context.textAlign = 'center'; context.textBaseline = 'middle'; context.fillText(text.toUpperCase(), 256, 49);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.7), material);
  mesh.position.set(x, y, z); scene.add(mesh);
  const reverse = mesh.clone(); reverse.rotation.y = Math.PI; reverse.position.z += .015; scene.add(reverse);
}
function building(scene: THREE.Object3D, x: number, z: number, w: number, d: number, h: number, color: number): void {
  const facade = mat(color, .52, .28);
  box(scene, x, h / 2, z, w, h, d, facade);
  box(scene, x, h + .25, z, w + .8, .5, d + .8, mat(0x283e4a, .35, .6));
  const faceZ = z + Math.sign(-z || 1) * (d / 2 + .04);
  const floors = Math.floor(h / 4), columns = Math.max(1, Math.floor(w / 4));
  const windows = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 2, .09), darkGlass, floors * columns);
  const sills = new THREE.InstancedMesh(new THREE.BoxGeometry(2, .18, .35), sillMaterial, floors * columns);
  const livedIn = new THREE.InstancedMesh(new THREE.BoxGeometry(1.5, 1.82, .02), new THREE.MeshBasicMaterial({ color: 0xb6a489 }), floors * columns);
  const transform = new THREE.Matrix4();
  let index = 0, lit = 0;
  for (let floor = 0; floor < floors; floor++) for (let col = 0; col < columns; col++) {
    const px = x - w / 2 + 2 + col * 4;
    const py = 3.2 + floor * 3.8;
    windows.setMatrixAt(index, transform.makeTranslation(px, py, faceZ));
    sills.setMatrixAt(index, transform.makeTranslation(px, py - 1.12, faceZ + .08 * Math.sign(faceZ - z)));
    if ((floor * 3 + col + Math.abs(Math.round(x))) % 7 === 0) livedIn.setMatrixAt(lit++, transform.makeTranslation(px, py, faceZ + .06 * Math.sign(faceZ - z)));
    index++;
  }
  windows.instanceMatrix.needsUpdate = true; sills.instanceMatrix.needsUpdate = true; livedIn.count = lit; livedIn.instanceMatrix.needsUpdate = true;
  scene.add(windows, sills, livedIn);
  const trim = (Math.round(x + z) % 3 === 0) ? amber : cyan;
  for (const side of [-1, 1]) {
    box(scene, x + side * (w / 2 - .26), h / 2, faceZ + Math.sign(faceZ - z) * .12, .1, h - 1, .1, trim);
    box(scene, x + side * (w / 2 - .32), h + .75, z, .42, 1.1, d + .7, mat(0x334b59, .4, .55));
  }
  for (let level = 4; level < h - 2; level += 8) box(scene, x, level, faceZ + Math.sign(faceZ - z) * .16, w - .8, .075, .08, trim);
  box(scene, x, h + .6, z, w * .48, .35, d * .65, darkGlass);
  box(scene, x, h + 1, z, w * .2, .32, d * .35, trim);
  box(scene, x, .09, z, w + 2, .18, d + 2, mat(0x707a74));
  const side = Math.sign(faceZ - z);
  box(scene, x, 1.65, faceZ + side * .08, 2.4, 3.1, .15, mat(0x27383b, .3, .3));
  box(scene, x, 1.72, faceZ + side * .19, 1.8, 2.75, .06, darkGlass);
  box(scene, x, 3.35, faceZ + side * .58, 3.1, .25, 1.1, mat(0x51666b, .6, .2));
  box(scene, x + w * .29, h + .7, z, 1.8, .9, 1.6, mat(0x657071, .8, .3));
}
export function createCityHabitat(scene: THREE.Scene) {
  const textures = createUrbanTextures();
  if (textures) { asphalt.map = textures.asphalt; asphalt.color.setHex(0xc5c5c5); asphalt.needsUpdate = true; concrete.map = textures.pavement; concrete.color.setHex(0xffffff); concrete.needsUpdate = true; darkGlass.map = textures.glass; darkGlass.needsUpdate = true; }
  scene.background = new THREE.Color(0x586f83); scene.fog = new THREE.FogExp2(0x5a7280, .0068);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(250, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, vertexShader: 'varying float vH; void main(){vH=position.y/250.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: 'varying float vH; void main(){vec3 horizon=vec3(0.46,0.47,0.52); vec3 high=vec3(0.13,0.25,0.39); float t=smoothstep(-0.1,0.7,vH); gl_FragColor=vec4(mix(horizon,high,t),1.0);}' }));
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xb6dce9, 0x43505d, 2.1));
  const sun = new THREE.DirectionalLight(0xffb17d, 2.5); sun.position.set(-35, 55, -25); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -90; sun.shadow.camera.right = 90; sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90; scene.add(sun);
  createCrashOutskirts(scene);
  box(scene, 0, -.45, 0, 80, .8, 80, mat(0x667565));
  box(scene, 0, -.03, 0, 22, .08, 148, asphalt); box(scene, 0, -.025, 0, 148, .08, 18, asphalt);
  for (const x of [-13.5, 13.5]) box(scene, x, .08, 0, 5, .16, 146, concrete);
  for (const z of [-12, 12]) box(scene, 0, .08, z, 146, .16, 5, concrete);
  for (let z = -68; z <= 68; z += 10) { box(scene, 0, .025, z, .22, .02, 4, line); for (const x of [-11, 11]) box(scene, x, .18, z, .22, .03, 4, mat(0xddd8c4)); }
  for (let x = -68; x <= 68; x += 10) box(scene, x, .025, 0, 4, .02, .22, line);
  for (let z = -68; z <= 68; z += 4) {
    for (const x of [-6.6, 6.6]) box(scene, x, .023, z, .13, .022, 1.65, cyan);
    if (Math.abs(z) > 10) for (const x of [-11.1, 11.1]) box(scene, x, .17, z, .14, .04, .65, amber);
  }
  for (const z of [-6, 6]) for (let x = -8; x <= 8; x += 2) box(scene, x, .04, z, 1.1, .025, 3, mat(0xd8d8ce));
  for (const x of [-9, 9]) for (let z = -7; z <= 7; z += 2) box(scene, x, .04, z, 3, .025, 1.1, mat(0xd8d8ce));
  const facades: { x: number; z: number; w: number; d: number }[] = [];
  const addBuilding = (x: number, z: number, w: number, d: number, h: number, color: number) => { building(scene, x, z, w, d, h, color); facades.push({ x, z, w, d }); };
  const palette = [0x536775, 0x394d61, 0x767f86, 0x4c6570, 0x777d81, 0x405564];
  for (let i = 0; i < 11; i++) {
    const z = -60 + i * 12;
    if (z > -38 && z < -18) continue;
    for (const side of [-1, 1]) {
      if ((side < 0 && z > -15 && z < 4) || (side > 0 && ((z > -25 && z < -7) || (z > 20 && z < 43)))) continue;
      addBuilding(side * (24 + (i % 3) * 3), z, 13 + (i % 2) * 3, 8, 13 + (i * 7 % 21), palette[(i + (side + 1) * 2) % palette.length]);
    }
  }
  for (let i = 0; i < 22; i++) {
    const x = -110 + i * 10;
    if (Math.abs(x) < 55) continue;
    addBuilding(x, 68, 8, 9, 18 + i * 3 % 29, palette[i % palette.length]);
  }
  // Taller towers frame the playable blocks without closing the street-level paths.
  for (const [x, z, h, w] of [[-53, -31, 142, 17], [50, -6, 126, 16], [-57, 32, 161, 14], [52, 54, 151, 18], [3, 95, 196, 24]] as const) {
    building(scene, x, z, w, w * .72, h, 0x354c5d);
    const spire = new THREE.Mesh(new THREE.CylinderGeometry(.18, .42, 10, 8), mat(0x7894a4, .3, .7));
    spire.position.set(x, h + 7, z); scene.add(spire);
    box(scene, x, h + 12.2, z, 1.2, .4, 1.2, cyan);
  }
  for (const z of [-49, 51]) {
    box(scene, 0, 13.5, z, 30, 2.1, 2.7, mat(0x334b5a, .42, .56));
    box(scene, 0, 13.6, z + 1.42, 29, 1.45, .08, darkGlass);
    box(scene, 0, 12.38, z, 30, .1, 2.8, cyan);
  }
  // The workshop, salvage yard, and depot remain navigable at street level.
  box(scene, -27, .05, -8, 16, .1, 17, mat(0x777e77));
  box(scene, -31, 3.5, -14, 13, 7, 4, mat(0x6c7775));
  box(scene, -26, 4.1, -16.15, 11, 2.1, .1, mat(0x34535b)); label(scene, 'VOSS SYSTEMS', -26, 4.1, -16.23, '#78e5db');
  for (const x of [-31, -27, -23]) { box(scene, x, 2.15, -16.3, 3.3, 3.4, .16, mat(0x536165, .65, .3)); for (let y = .75; y < 3.8; y += .45) box(scene, x, y, -16.42, 3.1, .035, .05, mat(0x303e43, .7, .3)); }
  box(scene, -26, 4.65, -17.1, 12, .22, 1.7, mat(0x8b5244));
  box(scene, -35.5, .9, -8, 2.1, 1.8, 1.1, mat(0x52616a, .75, .25));
  box(scene, -17, .75, -8, .6, 1.5, .6, mat(0x596468, .3, .7)); box(scene, -17, 1.6, -8, .3, .25, .3, mat(0xe5b65d, .3, .5));
  box(scene, 17, .75, 28, .6, 1.5, .6, mat(0x596468, .3, .7)); box(scene, 17, 1.6, 28, .3, .25, .3, mat(0x89d4b6, .3, .5));
  box(scene, 28, .06, -17, 17, .12, 20, mat(0x665e52));
  box(scene, 30, 3.2, -26, 12, 1.3, .2, mat(0x6b4d43)); label(scene, 'SALVAGE', 30, 3.2, -26.2, '#f2cc9d');
  for (const [x, z, w, h, d] of [[34, -17, 3.6, 1.6, 2.7], [36, -11, 2.7, 2.1, 2.1], [22, -24, 3.2, 1.2, 2.5]]) box(scene, x, h / 2, z, w, h, d, mat(0x776e5c, .95, .15));
  box(scene, 35, 6.5, -20, .3, 13, .3, mat(0x8f7863, .5, .55)); box(scene, 31, 12.6, -20, 8, .25, .25, mat(0x8f7863, .5, .55)); box(scene, 27, 9.5, -20, .08, 6, .08, mat(0x4d514a, .7, .5));
  box(scene, 21, .06, 28, 16, .12, 16, mat(0x888d87));
  box(scene, 26, 4, 36, 19, 8, 3, mat(0x768990)); label(scene, 'TRANSIT', 25, 5.2, 34.42, '#a1dbe1');
  const landingRing = new THREE.Mesh(new THREE.TorusGeometry(3.6, .12, 8, 32), cyan);
  landingRing.rotation.x = Math.PI / 2; landingRing.position.set(26, 8.18, 36); scene.add(landingRing);
  for (const side of [-1, 1]) box(scene, 26 + side * 3.2, 8.28, 36, .16, .2, 1.6, amber);
  box(scene, 26, 2.1, 34.35, 10, 3.8, .12, darkGlass); box(scene, 26, 4.1, 34.25, 12, .22, 1.4, mat(0x354e58, .5, .4));
  for (const x of [19, 23, 27, 31]) box(scene, x, 1.45, 22, .11, 2.9, .11, mat(0x667980, .6, .6));
  const pole = mat(0x3c4e52, .55, .55), redLight = new THREE.MeshStandardMaterial({ color: 0xff3026, emissive: 0xb51b16, emissiveIntensity: 1.2 });
  const greenLight = new THREE.MeshStandardMaterial({ color: 0x65d08f, emissive: 0x2a9c52, emissiveIntensity: 1.2 });
  for (const [x, z] of [[-10, -10], [10, 10], [10, -10], [-10, 10]]) {
    box(scene, x, 2.7, z, .18, 5.4, .18, pole); box(scene, x + (x < 0 ? 1 : -1), 5.3, z, 2, .13, .13, pole);
    const signalX = x + (x < 0 ? 2 : -2);
    box(scene, signalX, 4.8, z, .5, 1.2, .4, mat(0x202b2d, .55, .3));
    box(scene, signalX, 5.1, z + .23, .21, .21, .04, redLight); box(scene, signalX, 4.5, z + .23, .21, .21, .04, greenLight);
  }
  for (const [x, z] of [[-12, -30], [12, -42], [-12, 27], [12, 41]]) {
    box(scene, x, .42, z, 1.4, .84, .65, mat(0x46615c, .78, .32)); box(scene, x, .88, z, 1.48, .08, .72, mat(0x2b3c3d, .55, .35));
  }
  for (const [x, z] of [[-13, -43], [13, -32], [-13, 34], [13, 48]]) {
    box(scene, x, .56, z, 2.5, .16, .65, mat(0x886f55)); for (const dx of [-1, 1]) box(scene, x + dx, .29, z, .11, .5, .58, pole);
    box(scene, x, .95, z + .28, 2.5, .65, .12, mat(0x886f55));
  }
  for (const [x, z] of [[-8.5, -26], [8.5, 26], [-8.5, 36], [8.5, -46]]) {
    const grate = mat(0x435055, .8, .45); box(scene, x, .04, z, 1.1, .03, .75, grate);
    for (let i = -2; i <= 2; i++) box(scene, x + i * .17, .061, z, .035, .01, .6, mat(0x1e292d));
  }
  for (let i = 0; i < 13; i++) {
    const z = -60 + i * 10;
    if (Math.abs(z) < 9) continue;
    for (const x of [-10.5, 10.5]) {
      box(scene, x, 3.6, z, .15, 7, .15, mat(0x526164, .5, .7));
      box(scene, x + (x < 0 ? 1 : -1), 7, z, 2, .16, .15, mat(0x526164));
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.35, 8, 6), new THREE.MeshBasicMaterial({ color: 0xffdfab })); bulb.position.set(x + (x < 0 ? 2 : -2), 6.85, z); scene.add(bulb);
    }
  }
  for (const [x, z, heading] of [[-10, -18, 'UPTOWN'], [10, 18, 'SKYPORT']] as const) {
    box(scene, x, 5.7, z, .22, 11.4, .22, mat(0x425764, .42, .7));
    box(scene, x + (x < 0 ? 2.7 : -2.7), 10.6, z, 5.5, .18, .18, mat(0x425764, .42, .7));
    label(scene, heading, x + (x < 0 ? 3.5 : -3.5), 9.4, z, '#8fe7e0');
  }
  for (let i = 0; i < 10; i++) {
    const x = i % 2 ? -17 : 17, z = -51 + i * 11;
    box(scene, x, .9, z, 2.1, 1.3, 4.1, mat(i % 3 ? 0x455866 : 0x9c7460, .45, .35));
    box(scene, x, 1.62, z - .35, 1.9, .5, 1.8, darkGlass);
  }
  const crashShip = createCrashShip(scene);
  for (const [x, z] of [[-36, -22], [-35, -7], [35, -23], [34, -10], [17, 21], [33, 22]]) {
    box(scene, x, .8, z, 1.6, 1.6, 1.6, mat(0x687879));
  }
  for (const [x, z] of [[-38, 16], [38, 14], [-38, 43], [39, -43]]) {
    box(scene, x, 1.2, z, .3, 2.4, .3, mat(0x4e5c51));
    const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(2.5, 1), mat(0x56765f)); foliage.position.set(x, 4, z); scene.add(foliage);
  }
  const residentPositions = Object.fromEntries(residentIds.map(id => [id, new THREE.Vector3(residents[id].x, 0, residents[id].z)])) as Record<ResidentId, THREE.Vector3>;
  const materialPositions = Object.fromEntries(materialIds.map(id => [id, new THREE.Vector3(materials[id].x, 0, materials[id].z)])) as Record<MaterialId, THREE.Vector3>;
  const expanse = createCityExpanse(scene);
  const blocks = (x: number, z: number) => facades.some(bounds => Math.abs(x - bounds.x) < bounds.w / 2 + .55 && Math.abs(z - bounds.z) < bounds.d / 2 + .55) || expanse.blocks(x, z);
  const flyingTraffic = createFlyingTraffic(scene);
  const sync = (elapsed: number, player = { x: 0, z: 0 }, shipStage: ShipStage = 'outside') => {
    expanse.sync(player.x, player.z);
    flyingTraffic.sync(elapsed, player);
    crashShip.sync(shipStage, elapsed);
    sky.position.set(player.x, 0, player.z);
  };
  return { blocks, sync, shipPosition: new THREE.Vector3(crashSite.console.x, 0, crashSite.console.z), residentPositions, materialPositions, heightAt: (_x: number, _z: number) => 0, occluders: [] as THREE.Object3D[] };
}
