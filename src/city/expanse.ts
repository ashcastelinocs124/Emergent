import * as THREE from 'three';

const BLOCK = 80;
const RADIUS = 2;
const TILE_COUNT = (RADIUS * 2 + 1) ** 2;
const BUILDING_COUNT = TILE_COUNT * 4;
const unitBox = new THREE.BoxGeometry(1, 1, 1);

function facadeTexture(): THREE.CanvasTexture | null {
  if (typeof document === 'undefined') return null;
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 512;
  const ctx = canvas.getContext('2d'); if (!ctx) return null;
  ctx.fillStyle = '#d2d6d4'; ctx.fillRect(0, 0, 256, 512);
  for (let row = 0; row < 28; row++) for (let col = 0; col < 8; col++) {
    const x = col * 32 + 5, y = row * 18 + 4;
    ctx.fillStyle = (row * 13 + col * 7) % 19 < 2 ? '#b2b9aa' : '#4a6570';
    ctx.fillRect(x, y, 22, 11);
    ctx.fillStyle = '#e8ece2'; ctx.fillRect(x, y + 11, 22, 2);
  }
  for (let row = 0; row < 28; row += 7) {
    ctx.fillStyle = '#a2aaa9'; ctx.fillRect(0, row * 18 + 16, 256, 2);
  }
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4;
  return texture;
}

function instances(name: string, count: number, material: THREE.Material): THREE.InstancedMesh {
  const mesh = new THREE.InstancedMesh(unitBox, material, count);
  mesh.name = name;
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.frustumCulled = false;
  mesh.receiveShadow = true;
  return mesh;
}

const transform = new THREE.Matrix4();
function place(mesh: THREE.InstancedMesh, index: number, x: number, y: number, z: number, w: number, h: number, d: number): void {
  mesh.setMatrixAt(index, transform.makeScale(w, h, d).setPosition(x, y, z));
}

function height(tileX: number, tileZ: number, quadrant: number): number {
  const hash = Math.abs((tileX * 73856093) ^ (tileZ * 19349663) ^ ((quadrant + 1) * 83492791));
  return 45 + hash % 125 + (hash % 9 === 0 ? 65 : 0);
}

export function createCityExpanse(scene: THREE.Scene): {
  sync: (x: number, z: number) => void;
  blocks: (x: number, z: number) => boolean;
} {
  const district = new THREE.Group();
  district.name = 'city-expanse';
  scene.add(district);
  const ground = instances('district-ground', TILE_COUNT, new THREE.MeshStandardMaterial({ color: 0x667565, roughness: 1 }));
  const roadMaterial = new THREE.MeshStandardMaterial({ color: 0x313b43, roughness: .96 });
  const roadZ = instances('district-roads', TILE_COUNT, roadMaterial);
  const roadX = instances('district-cross-roads', TILE_COUNT, roadMaterial);
  const sidewalk = instances('district-sidewalks', TILE_COUNT * 4, new THREE.MeshStandardMaterial({ color: 0x84918d, roughness: .9 }));
  const markings = instances('district-lane-markings', TILE_COUNT * 12, new THREE.MeshBasicMaterial({ color: 0x91cfd2 }));
  const facade = facadeTexture();
  const towers = instances('district-buildings', BUILDING_COUNT, new THREE.MeshStandardMaterial({ color: 0xffffff, map: facade, roughness: .62, metalness: .18 }));
  const setbacks = instances('district-setbacks', BUILDING_COUNT, new THREE.MeshStandardMaterial({ color: 0xffffff, map: facade, roughness: .48, metalness: .25 }));
  const roofs = instances('district-roofs', BUILDING_COUNT, new THREE.MeshStandardMaterial({ color: 0x314a56, metalness: .5, roughness: .45 }));
  const roofLights = instances('district-roof-lights', BUILDING_COUNT, new THREE.MeshBasicMaterial({ color: 0x64dbd9 }));
  const accentsZ = instances('district-accents-z', BUILDING_COUNT, new THREE.MeshBasicMaterial({ color: 0x70d9d6 }));
  const accentsX = instances('district-accents-x', BUILDING_COUNT, new THREE.MeshBasicMaterial({ color: 0x70d9d6 }));
  const masts = instances('district-masts', BUILDING_COUNT, new THREE.MeshBasicMaterial({ color: 0x9cc5c9 }));
  const lampPoles = instances('district-lamp-poles', TILE_COUNT * 4, new THREE.MeshStandardMaterial({ color: 0x435d68, metalness: .55, roughness: .55 }));
  const lampBulbs = instances('district-lamp-bulbs', TILE_COUNT * 4, new THREE.MeshBasicMaterial({ color: 0xffdbad }));
  district.add(ground, roadZ, roadX, sidewalk, markings, towers, setbacks, roofs, roofLights, accentsZ, accentsX, masts, lampPoles, lampBulbs);
  let centerX = Number.NaN, centerZ = Number.NaN;
  const hidden = (mesh: THREE.InstancedMesh, index: number) => place(mesh, index, 0, -1000, 0, 0, 0, 0);

  const sync = (x: number, z: number) => {
    const nextX = Math.round(x / BLOCK), nextZ = Math.round(z / BLOCK);
    if (nextX === centerX && nextZ === centerZ) return;
    centerX = nextX; centerZ = nextZ;
    let tileIndex = 0;
    for (let dz = -RADIUS; dz <= RADIUS; dz++) for (let dx = -RADIUS; dx <= RADIUS; dx++) {
      const tileX = centerX + dx, tileZ = centerZ + dz;
      const cx = tileX * BLOCK, cz = tileZ * BLOCK;
      const core = tileX === 0 && tileZ === 0;
      const outskirts = tileZ < 0;
      if (core || outskirts) {
        for (const mesh of [ground, roadZ, roadX]) hidden(mesh, tileIndex);
        for (let i = 0; i < 4; i++) hidden(sidewalk, tileIndex * 4 + i);
        for (let i = 0; i < 12; i++) hidden(markings, tileIndex * 12 + i);
        for (let i = 0; i < 4; i++) { hidden(lampPoles, tileIndex * 4 + i); hidden(lampBulbs, tileIndex * 4 + i); }
      } else {
        place(ground, tileIndex, cx, -.48, cz, BLOCK, .8, BLOCK);
        place(roadZ, tileIndex, cx, -.075, cz, 18, .08, BLOCK);
        place(roadX, tileIndex, cx, -.07, cz, BLOCK, .08, 18);
        for (const side of [-1, 1]) {
          place(sidewalk, tileIndex * 4 + (side === -1 ? 0 : 1), cx + side * 12.5, -.015, cz, 5, .15, BLOCK);
          place(sidewalk, tileIndex * 4 + (side === -1 ? 2 : 3), cx, -.015, cz + side * 12.5, BLOCK, .15, 5);
        }
        for (let dash = 0; dash < 6; dash++) {
          const offset = -32 + dash * 12;
          place(markings, tileIndex * 12 + dash, cx, -.027, cz + offset, .19, .012, 4);
          place(markings, tileIndex * 12 + 6 + dash, cx + offset, -.022, cz, 4, .012, .19);
        }
        for (let lamp = 0; lamp < 4; lamp++) {
          const lx = cx + (lamp % 2 ? 13.8 : -13.8);
          const lz = cz + (lamp < 2 ? -29 : 29);
          place(lampPoles, tileIndex * 4 + lamp, lx, 3.25, lz, .16, 6.5, .16);
          place(lampBulbs, tileIndex * 4 + lamp, lx, 6.55, lz, .48, .26, .48);
        }
      }
      for (let quadrant = 0; quadrant < 4; quadrant++) {
        const index = tileIndex * 4 + quadrant;
        if (core || outskirts) {
          for (const mesh of [towers, setbacks, roofs, roofLights, accentsZ, accentsX, masts]) hidden(mesh, index);
          continue;
        }
        const sideX = quadrant % 2 ? 1 : -1, sideZ = quadrant < 2 ? -1 : 1;
        const bx = cx + sideX * 26, bz = cz + sideZ * 26;
        const h = height(tileX, tileZ, quadrant);
        const stepped = h > 120;
        const baseHeight = stepped ? h * .76 : h;
        const upperHeight = h - baseHeight;
        place(towers, index, bx, baseHeight / 2, bz, 20, baseHeight, 20);
        const palette = [0x536b79, 0x66777d, 0x3f5c6b, 0x777f85, 0x465b69];
        const color = new THREE.Color(palette[Math.abs(tileX * 7 + tileZ * 11 + quadrant) % palette.length]);
        towers.setColorAt(index, color);
        setbacks.setColorAt(index, color.clone().multiplyScalar(.91));
        if (stepped) {
          place(setbacks, index, bx, baseHeight + upperHeight / 2, bz, 15.5, upperHeight, 15.5);
        } else hidden(setbacks, index);
        place(roofs, index, bx, h + .2, bz, stepped ? 16.2 : 20.7, .4, stepped ? 16.2 : 20.7);
        place(roofLights, index, bx, h + .43, bz, 9, .08, 9);
        place(accentsZ, index, bx, baseHeight * .83, bz - sideZ * 10.17, 16, .1, .08);
        place(accentsX, index, bx - sideX * 10.17, baseHeight * .83, bz, .08, .1, 16);
        if (h > 170) place(masts, index, bx, h + 5, bz, .24, 10, .24);
        else hidden(masts, index);
      }
      tileIndex++;
    }
    for (const mesh of district.children as THREE.InstancedMesh[]) mesh.instanceMatrix.needsUpdate = true;
    towers.instanceColor!.needsUpdate = true;
    setbacks.instanceColor!.needsUpdate = true;
  };

  const blocks = (x: number, z: number): boolean => {
    const tileX = Math.round(x / BLOCK), tileZ = Math.round(z / BLOCK);
    if (tileZ < 0 || tileX === 0 && tileZ === 0) return false;
    const localX = x - tileX * BLOCK, localZ = z - tileZ * BLOCK;
    return Math.abs(Math.abs(localX) - 26) < 10.55 && Math.abs(Math.abs(localZ) - 26) < 10.55;
  };
  sync(0, 0);
  return { sync, blocks };
}
