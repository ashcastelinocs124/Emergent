import * as THREE from 'three';
import { materials, materialIds, residents, residentIds } from './content';
import { createUrbanTextures } from './urban-textures';
import type { MaterialId, ResidentId } from './model';
const mat = (color: number, roughness = .85, metalness = 0) => new THREE.MeshStandardMaterial({ color, roughness, metalness });
const asphalt = mat(0x252e34), concrete = mat(0x848d86), line = mat(0xbdb7a0), darkGlass = mat(0x24434d, .22, .35);
const sillMaterial = mat(0x5a6261);
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
  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(9, 1.7), new THREE.MeshBasicMaterial({ map: texture, side: THREE.DoubleSide }));
  mesh.position.set(x, y, z); scene.add(mesh);
}
function building(scene: THREE.Object3D, x: number, z: number, w: number, d: number, h: number, color: number, masonry?: THREE.Texture): void {
  const facade = mat(color);
  if (masonry) { facade.map = masonry; facade.color.lerp(new THREE.Color(0xffffff), .68); facade.needsUpdate = true; }
  box(scene, x, h / 2, z, w, h, d, facade);
  box(scene, x, h + .25, z, w + .5, .5, d + .5, mat(0x4b5559));
  const faceZ = z + Math.sign(-z || 1) * (d / 2 + .04);
  const floors = Math.floor(h / 4), columns = Math.max(1, Math.floor(w / 4));
  const windows = new THREE.InstancedMesh(new THREE.BoxGeometry(1.7, 2, .09), darkGlass, floors * columns);
  const sills = new THREE.InstancedMesh(new THREE.BoxGeometry(2, .18, .35), sillMaterial, floors * columns);
  const transform = new THREE.Matrix4();
  let index = 0;
  for (let floor = 0; floor < floors; floor++) for (let col = 0; col < columns; col++) {
    const px = x - w / 2 + 2 + col * 4;
    const py = 3.2 + floor * 3.8;
    windows.setMatrixAt(index, transform.makeTranslation(px, py, faceZ));
    sills.setMatrixAt(index, transform.makeTranslation(px, py - 1.12, faceZ + .08 * Math.sign(faceZ - z)));
    index++;
  }
  windows.instanceMatrix.needsUpdate = true; sills.instanceMatrix.needsUpdate = true;
  scene.add(windows, sills);
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
  scene.background = new THREE.Color(0x8dadae); scene.fog = new THREE.FogExp2(0x7b9297, .0065);
  const sky = new THREE.Mesh(new THREE.SphereGeometry(250, 32, 16), new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, vertexShader: 'varying float vH; void main(){vH=position.y/250.0; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}', fragmentShader: 'varying float vH; void main(){vec3 horizon=vec3(0.75,0.72,0.64); vec3 high=vec3(0.31,0.47,0.59); float t=smoothstep(-0.1,0.7,vH); gl_FragColor=vec4(mix(horizon,high,t),1.0);}' }));
  scene.add(sky);
  scene.add(new THREE.HemisphereLight(0xe0ebed, 0x4d554e, 2.1));
  const sun = new THREE.DirectionalLight(0xffc993, 3.0); sun.position.set(-35, 55, -25); sun.castShadow = true; sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -90; sun.shadow.camera.right = 90; sun.shadow.camera.top = 90; sun.shadow.camera.bottom = -90; scene.add(sun);
  box(scene, 0, -.45, 0, 160, .8, 160, mat(0x667565));
  box(scene, 0, -.03, 0, 22, .08, 148, asphalt); box(scene, 0, -.025, 0, 148, .08, 18, asphalt);
  for (const x of [-13.5, 13.5]) box(scene, x, .08, 0, 5, .16, 146, concrete);
  for (const z of [-12, 12]) box(scene, 0, .08, z, 146, .16, 5, concrete);
  for (let z = -68; z <= 68; z += 10) { box(scene, 0, .025, z, .22, .02, 4, line); for (const x of [-11, 11]) box(scene, x, .18, z, .22, .03, 4, mat(0xddd8c4)); }
  for (let x = -68; x <= 68; x += 10) box(scene, x, .025, 0, 4, .02, .22, line);
  for (const z of [-6, 6]) for (let x = -8; x <= 8; x += 2) box(scene, x, .04, z, 1.1, .025, 3, mat(0xd8d8ce));
  for (const x of [-9, 9]) for (let z = -7; z <= 7; z += 2) box(scene, x, .04, z, 3, .025, 1.1, mat(0xd8d8ce));
  const facades: { x: number; z: number; w: number; d: number }[] = [];
  const addBuilding = (x: number, z: number, w: number, d: number, h: number, color: number) => { building(scene, x, z, w, d, h, color, textures?.masonry); facades.push({ x, z, w, d }); };
  const palette = [0x8c9895, 0x657681, 0x9b9082, 0x6f7770, 0xb0a393, 0x586c72];
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
  // The crash lot, open workshop, salvage yard, and depot remain navigable at street level.
  box(scene, 0, .02, -30, 19, .06, 17, mat(0x4b5557));
  box(scene, -27, .05, -8, 16, .1, 17, mat(0x777e77));
  box(scene, -31, 3.5, -14, 13, 7, 4, mat(0x6c7775));
  box(scene, -26, 4.1, -16.15, 11, 2.1, .1, mat(0x34535b)); label(scene, 'VOSS AUTO', -26, 4.1, -16.23);
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
  for (let i = 0; i < 10; i++) {
    const x = i % 2 ? -17 : 17, z = -51 + i * 11;
    box(scene, x, .9, z, 2.1, 1.3, 4.1, mat(i % 3 ? 0x455866 : 0x9c7460, .45, .35));
    box(scene, x, 1.62, z - .35, 1.9, .5, 1.8, darkGlass);
  }
  // The crashed ship reads as a fuselage with a cockpit and damaged wings from street level.
  const shipX = 5;
  const hull = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 2.1, 8.2, 12), mat(0x96aaa9, .38, .7)); hull.rotation.x = Math.PI / 2; hull.position.set(shipX, 2.3, -34); hull.castShadow = true; scene.add(hull);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(1.65, 3.1, 12), mat(0x819b9d, .35, .7)); nose.rotation.x = Math.PI / 2; nose.position.set(shipX, 2.3, -28.7); nose.castShadow = true; scene.add(nose);
  box(scene, shipX, 3.56, -31.5, 2.2, .1, 2.8, darkGlass);
  for (const side of [-1, 1]) { const wing = box(scene, shipX + side * 3.5, 1.45, -35, 5, .22, 2.6, mat(0x738e91, .38, .65)); wing.rotation.z = side * -.13; box(scene, shipX + side * 5.4, 1.6, -37.2, .35, 1.7, 2.3, mat(0x526f73, .42, .7)); }
  for (const x of [-1.15, 1.15]) { const thruster = new THREE.Mesh(new THREE.CylinderGeometry(.5, .6, 1.1, 12), mat(0x3d5055, .32, .75)); thruster.rotation.x = Math.PI / 2; thruster.position.set(shipX + x, 1.78, -38.8); scene.add(thruster); }
  box(scene, 0, .95, -27, 1.3, 1.9, .72, mat(0x4e666b, .38, .62)); box(scene, 0, 1.28, -27.41, 1.05, .72, .06, darkGlass);
  if (typeof document !== 'undefined') {
    const panel = document.createElement('canvas'); panel.width = 256; panel.height = 160; const ctx = panel.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0b252b'; ctx.fillRect(0, 0, 256, 160); ctx.strokeStyle = '#7fd7b6'; ctx.lineWidth = 3; ctx.strokeRect(8, 8, 240, 144);
      ctx.fillStyle = '#b8f1ca'; ctx.font = 'bold 19px monospace'; ctx.fillText('AE / REPAIR', 22, 42);
      for (let i = 0; i < 3; i++) { ctx.fillStyle = '#385450'; ctx.fillRect(22, 61 + i * 24, 210, 13); ctx.fillStyle = '#9acdab'; ctx.fillRect(22, 61 + i * 24, 130 + i * 25, 13); }
      const display = new THREE.CanvasTexture(panel); display.colorSpace = THREE.SRGBColorSpace;
      const screen = new THREE.Mesh(new THREE.PlaneGeometry(1.0, .63), new THREE.MeshBasicMaterial({ map: display, side: THREE.DoubleSide })); screen.position.set(0, 1.3, -27.48); scene.add(screen);
    }
  }
  const core = new THREE.Mesh(new THREE.SphereGeometry(.16, 12, 8), new THREE.MeshBasicMaterial({ color: 0xffaa53 })); core.position.set(0, 1.8, -27.42); scene.add(core);
  for (const [x, z] of [[-36, -22], [-35, -7], [35, -23], [34, -10], [17, 21], [33, 22]]) {
    box(scene, x, .8, z, 1.6, 1.6, 1.6, mat(0x687879));
  }
  for (const [x, z] of [[-38, 16], [38, 14], [-38, 43], [39, -43]]) {
    box(scene, x, 1.2, z, .3, 2.4, .3, mat(0x4e5c51));
    const foliage = new THREE.Mesh(new THREE.IcosahedronGeometry(2.5, 1), mat(0x56765f)); foliage.position.set(x, 4, z); scene.add(foliage);
  }
  const residentPositions = Object.fromEntries(residentIds.map(id => [id, new THREE.Vector3(residents[id].x, 0, residents[id].z)])) as Record<ResidentId, THREE.Vector3>;
  const materialPositions = Object.fromEntries(materialIds.map(id => [id, new THREE.Vector3(materials[id].x, 0, materials[id].z)])) as Record<MaterialId, THREE.Vector3>;
  const blocks = (x: number, z: number) => facades.some(bounds => Math.abs(x - bounds.x) < bounds.w / 2 + .55 && Math.abs(z - bounds.z) < bounds.d / 2 + .55);
  return { blocks, shipPosition: new THREE.Vector3(0, 0, -27), residentPositions, materialPositions, heightAt: (_x: number, _z: number) => 0, occluders: [] as THREE.Object3D[] };
}
