import * as THREE from 'three';

function texture(size: number, draw: (ctx: CanvasRenderingContext2D, random: () => number) => void): THREE.CanvasTexture {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = size;
  const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('Canvas 2D unavailable');
  let seed = 19517; const random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  draw(ctx, random);
  const map = new THREE.CanvasTexture(canvas); map.colorSpace = THREE.SRGBColorSpace;
  map.wrapS = map.wrapT = THREE.RepeatWrapping; map.anisotropy = 4;
  return map;
}

export function createUrbanTextures(): { asphalt: THREE.CanvasTexture; pavement: THREE.CanvasTexture; masonry: THREE.CanvasTexture; glass: THREE.CanvasTexture } | null {
  if (typeof document === 'undefined') return null;
  const asphalt = texture(512, (ctx, random) => {
    ctx.fillStyle = '#4d5556'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 24000; i++) { const shade = Math.floor(42 + random() * 85); ctx.fillStyle = `rgba(${shade},${shade + 3},${shade + 2},${.12 + random() * .18})`; const x = random() * 512, y = random() * 512; ctx.fillRect(x, y, 1 + random() * 3, 1 + random() * 2); }
    ctx.strokeStyle = '#252e30'; ctx.lineWidth = 1.2;
    for (let i = 0; i < 14; i++) { ctx.beginPath(); let x = random() * 512, y = random() * 512; ctx.moveTo(x, y); for (let j = 0; j < 5; j++) { x += random() * 35 - 17; y += random() * 34 - 17; ctx.lineTo(x, y); } ctx.stroke(); }
    ctx.fillStyle = '#9d9a86'; for (let i = 0; i < 14; i++) ctx.fillRect(random() * 512, random() * 512, 2 + random() * 6, 1);
  }); asphalt.repeat.set(7, 30);
  const pavement = texture(512, (ctx, random) => {
    ctx.fillStyle = '#a6a9a1'; ctx.fillRect(0, 0, 512, 512);
    for (let i = 0; i < 15000; i++) { const v = Math.floor(65 + random() * 115); ctx.fillStyle = `rgba(${v},${v},${v - 5},${.06 + random() * .16})`; ctx.fillRect(random() * 512, random() * 512, 1 + random() * 3, 1 + random() * 3); }
    ctx.strokeStyle = '#777f79'; ctx.lineWidth = 3; for (let n = 0; n <= 512; n += 128) { ctx.beginPath(); ctx.moveTo(n, 0); ctx.lineTo(n, 512); ctx.moveTo(0, n); ctx.lineTo(512, n); ctx.stroke(); }
  }); pavement.repeat.set(2, 20);
  const masonry = texture(512, (ctx, random) => {
    ctx.fillStyle = '#a7a49d'; ctx.fillRect(0, 0, 512, 512);
    for (let row = 0; row < 16; row++) for (let col = -1; col < 6; col++) { const x = col * 102 + (row % 2) * 51, y = row * 32; const tint = Math.floor(145 + random() * 65); ctx.fillStyle = `rgb(${tint},${tint - 8},${tint - 15})`; ctx.fillRect(x + 2, y + 2, 98, 27); ctx.fillStyle = 'rgba(62,67,65,.12)'; ctx.fillRect(x + 4, y + 25, 95, 3); }
    for (let i = 0; i < 3500; i++) { ctx.fillStyle = `rgba(30,38,38,${random() * .13})`; ctx.fillRect(random() * 512, random() * 512, 1 + random() * 3, 1 + random() * 2); }
  }); masonry.repeat.set(5, 5);
  const glass = texture(256, (ctx, random) => {
    const gradient = ctx.createLinearGradient(0, 0, 256, 256); gradient.addColorStop(0, '#5c8288'); gradient.addColorStop(.35, '#1d3942'); gradient.addColorStop(.54, '#506e72'); gradient.addColorStop(1, '#142b32');
    ctx.fillStyle = gradient; ctx.fillRect(0, 0, 256, 256);
    ctx.fillStyle = '#e1e2d54d'; for (let i = 0; i < 6; i++) ctx.fillRect(random() * 256, random() * 256, 1 + random() * 3, 10 + random() * 25);
    ctx.fillStyle = '#e8e1bb32'; ctx.fillRect(24, 220, 180, 13);
  });
  const loader = new THREE.TextureLoader();
  for (const [target, path] of [[asphalt, '/textures/worn-asphalt.jpg'], [pavement, '/textures/pavement.jpg'], [masonry, '/textures/brick.jpg']] as const) {
    loader.load(path, loaded => { (target as THREE.Texture).image = loaded.image; target.needsUpdate = true; loaded.dispose(); });
  }
  return { asphalt, pavement, masonry, glass };
}
