export const crashSite = {
  ship: { x: -22, z: -175 },
  aboard: { x: -20, z: -168 },
  hatch: { x: -20, z: -171 },
  exit: { x: -17, z: -162 },
  cloak: { x: -19, z: -165 },
  console: { x: -27, z: -168 },
  cityGateZ: -72,
} as const;

export const isCrashOutskirts = (z: number): boolean => z < crashSite.cityGateZ;
