import * as THREE from 'three';
import type { CreatureState, WorldState } from '../shared/model';
import { terrainHeight } from './habitat';

export interface CreatureViews {
  sync(world: WorldState, alpha: number): void;
  dispose(): void;
}

const materials = {
  guardian: new THREE.MeshStandardMaterial({ color: 0x51416d, metalness: .19, roughness: .52 }),
  guardianRidge: new THREE.MeshStandardMaterial({ color: 0x9d79bd, metalness: .1, roughness: .47 }),
  grazer: new THREE.MeshStandardMaterial({ color: 0x80a999, roughness: .76 }),
  grazerShell: new THREE.MeshStandardMaterial({ color: 0x345b5c, metalness: .18, roughness: .62 }),
  stalker: new THREE.MeshStandardMaterial({ color: 0x243c46, metalness: .29, roughness: .4 }),
  stalkerSpine: new THREE.MeshStandardMaterial({ color: 0x8daaa1, roughness: .4 }),
  eye: new THREE.MeshBasicMaterial({ color: 0xf1ac76 }),
  eyeCold: new THREE.MeshBasicMaterial({ color: 0xb4e4df }),
};

const sphere = new THREE.SphereGeometry(1, 12, 8);
const spike = new THREE.ConeGeometry(1, 1, 6);
const limb = new THREE.CylinderGeometry(.16, .27, 1, 7);

function part(group: THREE.Group, geometry: THREE.BufferGeometry, material: THREE.Material,
  position: [number, number, number], scale: [number, number, number], detail = true): THREE.Mesh {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  mesh.scale.set(...scale);
  mesh.castShadow = true;
  mesh.userData.detail = detail;
  group.add(mesh);
  return mesh;
}

function makeGuardian(group: THREE.Group): void {
  part(group, sphere, materials.guardian, [0, 2.1, 0], [1.75, 1.55, 2.25], false);
  part(group, sphere, materials.guardianRidge, [0, 2.94, -.55], [1.4, .56, 1.5]);
  part(group, sphere, materials.guardian, [0, 2.4, 1.65], [1.2, .96, 1.08]);
  for (const side of [-1, 1]) {
    const front = part(group, limb, materials.guardian, [side * 1.1, 1.1, 1.35], [2.3, 1.7, 2.3]);
    front.rotation.z = side * .18;
    const rear = part(group, limb, materials.guardian, [side * 1.2, 1.05, -1.45], [2.5, 1.8, 2.5]);
    rear.rotation.z = side * .2;
    part(group, sphere, materials.eye, [side * .65, 2.75, 2.46], [.18, .12, .08]);
    for (let i = 0; i < 3; i++) {
      const ridge = part(group, spike, materials.guardianRidge, [side * (.65 + i * .25), 3.45, .2 - i * .65], [.22, .8 + i * .2, .24]);
      ridge.rotation.z = side * -.18;
    }
  }
}

function makeGrazer(group: THREE.Group): void {
  part(group, sphere, materials.grazer, [0, 1.12, 0], [.75, .66, 1.35], false);
  part(group, sphere, materials.grazerShell, [0, 1.54, -.22], [.72, .38, 1.06]);
  part(group, sphere, materials.grazer, [0, 1.42, 1.06], [.55, .53, .66]);
  for (const side of [-1, 1]) {
    for (const fore of [-.72, .85]) part(group, limb, materials.grazer, [side * .52, .54, fore], [1.15, 1, 1.15]);
    part(group, sphere, materials.eyeCold, [side * .35, 1.55, 1.57], [.13, .15, .08]);
    const antenna = part(group, spike, materials.grazerShell, [side * .33, 2.08, 1.31], [.11, .69, .11]);
    antenna.rotation.z = side * -.35;
  }
}

function makeStalker(group: THREE.Group): void {
  part(group, sphere, materials.stalker, [0, 1.38, 0], [.61, .48, 1.55], false);
  part(group, sphere, materials.stalker, [0, 1.62, 1.28], [.5, .36, .77]);
  for (const side of [-1, 1]) {
    for (const fore of [-.95, .85]) {
      const leg = part(group, limb, materials.stalker, [side * .52, .7, fore], [1.1, 1.44, 1.1]);
      leg.rotation.z = side * .3;
    }
    part(group, sphere, materials.eye, [side * .29, 1.79, 1.92], [.14, .07, .06]);
  }
  for (let i = 0; i < 6; i++) {
    const spine = part(group, spike, materials.stalkerSpine, [0, 1.96, -1.02 + i * .43], [.22, .47, .22]);
    spine.rotation.x = -.42;
  }
  const tail = part(group, spike, materials.stalker, [0, 1.57, -1.77], [.3, 1.45, .3]);
  tail.rotation.x = -Math.PI / 2;
}

export function createCreatureViews(scene: THREE.Scene, creatures: CreatureState[]): CreatureViews {
  const views = new Map<string, THREE.Group>();
  const previous = new Map<string, THREE.Vector3>();
  for (const creature of creatures) {
    const group = new THREE.Group();
    group.name = creature.id;
    group.userData.speciesId = creature.speciesId;
    if (creature.speciesId === 'guardian') makeGuardian(group);
    else if (creature.speciesId === 'grazer') makeGrazer(group);
    else makeStalker(group);
    group.position.set(creature.position.x, terrainHeight(creature.position.x, creature.position.z), creature.position.z);
    group.rotation.y = creature.id.length * 1.3;
    views.set(creature.id, group);
    previous.set(creature.id, group.position.clone());
    scene.add(group);
  }
  return {
    sync(world, alpha) {
      for (const creature of world.creatures) {
        const group = views.get(creature.id);
        if (!group) continue;
        group.visible = creature.alive;
        if (!creature.alive) continue;
        const next = new THREE.Vector3(creature.position.x, terrainHeight(creature.position.x, creature.position.z), creature.position.z);
        const old = previous.get(creature.id)!;
        group.position.lerpVectors(old, next, alpha);
        const dx = next.x - old.x;
        const dz = next.z - old.z;
        if (Math.hypot(dx, dz) > .005) group.rotation.y = Math.atan2(dx, dz);
        const moving = !!creature.currentIntent && !['HIDE'].includes(creature.currentIntent.action);
        group.position.y += moving ? Math.abs(Math.sin(world.time * (creature.speciesId === 'guardian' ? 5 : 9))) * .12 : Math.sin(world.time * 1.5 + creature.id.length) * .025;
        group.rotation.z = creature.currentIntent?.action === 'DEFEND' ? Math.sin(world.time * 10) * .055 : 0;
        const separation = Math.hypot(group.position.x - world.player.position.x, group.position.z - world.player.position.z);
        group.children.forEach(child => { if (child.userData.detail) child.visible = separation < 42; });
        previous.set(creature.id, next);
      }
    },
    dispose() { for (const group of views.values()) scene.remove(group); views.clear(); },
  };
}
