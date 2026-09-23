import * as THREE from 'three';
import type { WorldState } from '../shared/model';
import type { VisorTarget } from '../ui/visor';
import { terrainHeight } from './habitat';
import type { Vec3 } from '../shared/model';
import type { Visibility } from '../shared/journal';

const LABELS = { egg: 'Collect egg', spore: 'Collect spore', corpse: 'Collect remains', component: 'Recover drive regulator' };

export function findInteractionTarget(world: WorldState, camera: THREE.Camera): VisorTarget | null {
  const look = new THREE.Vector3();
  camera.getWorldDirection(look);
  const origin = camera.position;
  const targets = world.items.filter(item => item.available).map(item => ({
    id: item.id, label: LABELS[item.kind], point: new THREE.Vector3(item.position.x, terrainHeight(item.position.x, item.position.z) + .8, item.position.z),
  }));
  targets.push({ id: 'ship-console', label: world.componentInstalled ? 'Board ship' : 'Install drive regulator',
    point: new THREE.Vector3(world.shipPosition.x + 2, world.shipPosition.y + 1.7, world.shipPosition.z) });
  let nearest: VisorTarget | null = null;
  let best = Infinity;
  for (const target of targets) {
    const delta = target.point.clone().sub(origin);
    const distance = delta.length();
    if (distance > (target.id === 'ship-console' ? 8 : 3.5) || distance < .3) continue;
    if (delta.normalize().dot(look) < .7) continue;
    if (distance < best) { nearest = { id: target.id, label: target.label }; best = distance; }
  }
  return nearest;
}

export function creatureVisibility(camera: THREE.Camera, position: Vec3): Visibility {
  const origin = camera.position;
  const target = new THREE.Vector3(position.x, terrainHeight(position.x, position.z) + 1.5, position.z);
  const ray = target.clone().sub(origin);
  const distance = Math.hypot(ray.x, ray.z);
  const look = new THREE.Vector3();
  camera.getWorldDirection(look);
  const orientation = ray.normalize().dot(look);
  let lineOfSight = true;
  for (let i = 1; i < 8; i++) {
    const t = i / 8;
    const x = origin.x + (target.x - origin.x) * t;
    const z = origin.z + (target.z - origin.z) * t;
    const rayHeight = origin.y + (target.y - origin.y) * t;
    if (terrainHeight(x, z) > rayHeight - .35) { lineOfSight = false; break; }
  }
  return { lineOfSight, distance, orientation };
}
