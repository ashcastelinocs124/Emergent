export function terrainHeight(x: number, z: number): number {
  const ridges = Math.sin(x * 0.024) * Math.cos(z * 0.019) * 4.2;
  const detail = Math.sin(x * 0.071 + z * 0.045) * Math.cos(z * 0.084) * 1.15;
  const basin = -3.8 * Math.exp(-((x + 12) ** 2 + (z - 14) ** 2) / 2600);
  return ridges + detail + basin;
}
