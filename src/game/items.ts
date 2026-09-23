import * as THREE from 'three';
import type { ItemState, WorldState } from '../shared/model';
import { terrainHeight } from './habitat';

export function createItemViews(scene: THREE.Scene, items: ItemState[]): { sync(world: WorldState): void; dispose(): void } {
  const views = new Map<string, THREE.Mesh>();
  const materials = {
    egg: new THREE.MeshStandardMaterial({ color: 0xa5b9d0, emissive: 0x2d4b7d, emissiveIntensity: .45, metalness: .14, roughness: .32 }),
    spore: new THREE.MeshStandardMaterial({ color: 0xa8ccb3, emissive: 0x457965, emissiveIntensity: .6, roughness: .6 }),
    corpse: new THREE.MeshStandardMaterial({ color: 0x474b54, roughness: .9 }),
    component: new THREE.MeshStandardMaterial({ color: 0xc49359, emissive: 0x5b2b0c, emissiveIntensity: .55, metalness: .78, roughness: .36 }),
  };
  for (const item of items) {
    const geometry = item.kind === 'component' ? new THREE.CylinderGeometry(.55, .55, 1.1, 10)
      : item.kind === 'spore' ? new THREE.SphereGeometry(.43, 9, 6)
        : new THREE.SphereGeometry(item.kind === 'egg' ? .9 : 1.1, 12, 9);
    const mesh = new THREE.Mesh(geometry, materials[item.kind]);
    mesh.scale.set(item.kind === 'egg' ? .75 : 1, item.kind === 'egg' ? 1.45 : 1, item.kind === 'egg' ? .78 : 1);
    mesh.castShadow = true;
    mesh.position.set(item.position.x, terrainHeight(item.position.x, item.position.z) + (item.kind === 'component' ? .9 : item.kind === 'spore' ? .35 : 1.05), item.position.z);
    mesh.visible = item.available;
    mesh.name = item.id;
    views.set(item.id, mesh);
    scene.add(mesh);
  }
  return {
    sync(world) {
      for (const item of world.items) {
        const mesh = views.get(item.id);
        if (!mesh) continue;
        mesh.visible = item.available;
        mesh.position.x = item.position.x;
        mesh.position.z = item.position.z;
        mesh.position.y = terrainHeight(item.position.x, item.position.z) + (item.kind === 'component' ? .9 : item.kind === 'spore' ? .35 : 1.05);
        if (item.kind === 'egg') mesh.rotation.y = world.time * .1;
      }
    },
    dispose() { for (const mesh of views.values()) { scene.remove(mesh); mesh.geometry.dispose(); } views.clear(); },
  };
}
