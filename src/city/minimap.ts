type Point = { x: number; z: number };
import { crashSite } from './geography';

const BLOCK = 80;
const SCALE = 1.15;
const landmarks = [
  { ...crashSite.console, color: '#8ad9e5' },
  { x: -26, z: -14, color: '#dfbd77' },
  { x: 30, z: -17, color: '#dfbd77' },
  { x: 26, z: 36, color: '#dfbd77' },
];

export function drawCityMinimap(canvas: HTMLCanvasElement, player: Point, forward: Point): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width, height } = canvas;
  const mapX = (x: number) => width / 2 + (x - player.x) * SCALE;
  const mapZ = (z: number) => height / 2 + (z - player.z) * SCALE;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = '#394649';
  ctx.fillRect(0, 0, width, height);

  const centerX = Math.round(player.x / BLOCK), centerZ = Math.round(player.z / BLOCK);
  for (let tz = centerZ - 2; tz <= centerZ + 2; tz++) {
    for (let tx = centerX - 2; tx <= centerX + 2; tx++) {
      const x = tx * BLOCK, z = tz * BLOCK;
      if (tz < 0) {
        if (tx !== 0) continue;
        ctx.fillStyle = '#746d5c';
        ctx.fillRect(mapX(x - 11), mapZ(z - 40), 22 * SCALE, BLOCK * SCALE);
        ctx.fillStyle = '#34403e';
        ctx.fillRect(mapX(x - 7), mapZ(z - 40), 14 * SCALE, BLOCK * SCALE);
        continue;
      }
      ctx.fillStyle = '#8e9894';
      ctx.fillRect(mapX(x - 15), mapZ(z - 40), 30 * SCALE, BLOCK * SCALE);
      ctx.fillRect(mapX(x - 40), mapZ(z - 15), BLOCK * SCALE, 30 * SCALE);
      ctx.fillStyle = '#566369';
      ctx.fillRect(mapX(x - 9), mapZ(z - 40), 18 * SCALE, BLOCK * SCALE);
      ctx.fillRect(mapX(x - 40), mapZ(z - 9), BLOCK * SCALE, 18 * SCALE);
      ctx.fillStyle = '#2d393d';
      for (const bx of [-26, 26]) for (const bz of [-26, 26]) {
        ctx.fillRect(mapX(x + bx - 10), mapZ(z + bz - 10), 20 * SCALE, 20 * SCALE);
      }
    }
  }

  ctx.strokeStyle = '#cfdbcf55';
  ctx.lineWidth = 1;
  for (let tz = centerZ - 2; tz <= centerZ + 2; tz++) {
    const z = tz * BLOCK;
    ctx.beginPath(); ctx.moveTo(0, mapZ(z)); ctx.lineTo(width, mapZ(z)); ctx.stroke();
  }
  for (const marker of landmarks) {
    const x = mapX(marker.x), y = mapZ(marker.z);
    if (x < 4 || x > width - 4 || y < 4 || y > height - 4) continue;
    ctx.beginPath(); ctx.arc(x, y, 3.5, 0, Math.PI * 2);
    ctx.fillStyle = marker.color; ctx.fill();
    ctx.strokeStyle = '#172329'; ctx.lineWidth = 1.5; ctx.stroke();
  }

  const angle = Math.atan2(forward.x, -forward.z);
  ctx.save(); ctx.translate(width / 2, height / 2); ctx.rotate(angle);
  ctx.shadowColor = '#071319'; ctx.shadowBlur = 6;
  ctx.beginPath(); ctx.moveTo(0, -10); ctx.lineTo(7, 8); ctx.lineTo(0, 4); ctx.lineTo(-7, 8); ctx.closePath();
  ctx.fillStyle = '#f5f7ec'; ctx.fill();
  ctx.strokeStyle = '#15292d'; ctx.lineWidth = 2; ctx.stroke();
  ctx.restore();
}
