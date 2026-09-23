import type { CreatureState, PlayerState, Vec3, WorldState } from './model';
import { applyMemoryEvent } from './memory';
import { terrainHeight } from './terrain';

const distance = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (value: number): number => Math.max(0, Math.min(1, value));

export function witnessesTheft(creature: CreatureState, world: WorldState): boolean {
  const separation = distance(creature.position, world.player.position);
  if (!creature.alive || separation > 18 || (world.player.hidden && separation > 6)) return false;
  const dx = world.player.position.x - creature.position.x;
  const dz = world.player.position.z - creature.position.z;
  const length = Math.hypot(dx, dz) || 1;
  if ((creature.facing.x * dx + creature.facing.z * dz) / length < -.2) return false;
  const fromY = terrainHeight(creature.position.x, creature.position.z) + 2;
  const toY = terrainHeight(world.player.position.x, world.player.position.z) + 1.5;
  for (let step = 1; step < 8; step++) {
    const t = step / 8;
    const x = creature.position.x + dx * t;
    const z = creature.position.z + dz * t;
    if (terrainHeight(x, z) > fromY + (toY - fromY) * t - .35) return false;
  }
  return true;
}

export function tickSuit(player: PlayerState, dt: number, shipPosition: Vec3): PlayerState {
  const inShelter = distance(player.position, shipPosition) <= 10;
  const air = clamp(player.air + dt * (inShelter ? 1 / 22 : -1 / 180));
  const power = clamp(player.power + dt * (inShelter ? 1 / 30 : player.scannerOn ? -1 / 145 : -1 / 600));
  const food = clamp(player.food - dt / 700);
  const health = clamp(player.health + dt * (inShelter ? .018 : air <= 0 ? -.045 : food <= 0 ? -.01 : 0));
  return { ...player, air, power, food, health, scannerOn: power > 0 && player.scannerOn };
}

export function interact(world: WorldState, targetId: string,
  canWitness: (creature: CreatureState, world: WorldState) => boolean = witnessesTheft): WorldState {
  const item = world.items.find(candidate => candidate.id === targetId && candidate.available);
  if (!item || distance(world.player.position, item.position) > 3.5 || world.player.inventory.length >= 4) return world;
  if (item.kind === 'component' && !world.componentExposed) return world;
  const player = { ...world.player, inventory: [...world.player.inventory, { ...item, available: false }] };
  const items = world.items.map(candidate => candidate.id === item.id ? { ...candidate, available: false } : candidate);
  let creatures = world.creatures;
  if (item.kind === 'egg' && item.ownerSpecies) {
    creatures = world.creatures.map(creature => {
      if (creature.speciesId !== item.ownerSpecies || !canWitness(creature, world)) return creature;
      const remembered = applyMemoryEvent(creature, { id: `${item.id}:${creature.id}:stolen`, type: 'egg_stolen',
        creatureId: creature.id, otherId: 'player', at: world.time, position: world.player.position });
      return { ...remembered, currentIntent: null, decisionEpoch: remembered.decisionEpoch + 1, nextDecisionAt: world.time };
    });
  }
  const componentExposed = world.componentExposed || (item.kind === 'egg' && world.nests.some(nest =>
    nest.speciesId === item.ownerSpecies && distance(item.position, nest.position) <= 6));
  return { ...world, player, items, creatures, componentExposed };
}

export function dropItem(world: WorldState, itemId: string): WorldState {
  const item = world.player.inventory.find(candidate => candidate.id === itemId);
  if (!item) return world;
  const player = { ...world.player, inventory: world.player.inventory.filter(candidate => candidate.id !== itemId) };
  const items = world.items.map(candidate => candidate.id === itemId
    ? { ...candidate, available: true, position: { ...world.player.position } } : candidate);
  const creatures = item.kind === 'egg' ? world.creatures.map(creature => creature.speciesId === item.ownerSpecies &&
    (creature.currentIntent?.action === 'DEFEND' || distance(creature.position, world.player.position) <= 24)
    ? { ...creature, currentIntent: null, decisionEpoch: creature.decisionEpoch + 1, nextDecisionAt: world.time } : creature) : world.creatures;
  return { ...world, player, items, creatures };
}

export function useItem(world: WorldState, itemId: string): WorldState {
  const item = world.player.inventory.find(candidate => candidate.id === itemId);
  if (!item || (item.kind !== 'egg' && item.kind !== 'spore')) return world;
  return { ...world, player: { ...world.player,
    inventory: world.player.inventory.filter(candidate => candidate.id !== itemId),
    food: clamp(world.player.food + (item.kind === 'egg' ? .55 : .35)),
    health: clamp(world.player.health + (item.kind === 'egg' ? .2 : .07)),
    air: clamp(world.player.air + (item.kind === 'egg' ? .08 : 0)) } };
}

export function repairShip(world: WorldState): WorldState {
  if (world.componentInstalled || distance(world.player.position, world.shipPosition) > 8 ||
    !world.player.inventory.some(item => item.kind === 'component')) return world;
  return { ...world, componentInstalled: true, player: { ...world.player,
    inventory: world.player.inventory.filter(item => item.kind !== 'component') } };
}

export function recoverAtShip(world: WorldState): WorldState {
  if (world.player.health > 0) return world;
  const carried = new Set(world.player.inventory.map(item => item.id));
  return { ...world,
    player: { ...world.player, position: { ...world.shipPosition }, inventory: [], air: .65, power: .6, health: .45 },
    items: world.items.map(item => carried.has(item.id)
      ? { ...item, available: true, position: { ...world.player.position } } : item),
    creatures: world.creatures.map(creature => creature.currentIntent?.targetId === 'player'
      ? { ...creature, currentIntent: null, decisionEpoch: creature.decisionEpoch + 1, nextDecisionAt: world.time }
      : creature) };
}
