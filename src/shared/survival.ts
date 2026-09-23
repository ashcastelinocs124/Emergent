import type { PlayerState, Vec3, WorldState } from './model';
import { applyMemoryEvent } from './memory';

const distance = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (value: number): number => Math.max(0, Math.min(1, value));

export function tickSuit(player: PlayerState, dt: number, shipPosition: Vec3): PlayerState {
  const inShelter = distance(player.position, shipPosition) <= 10;
  const air = clamp(player.air + dt * (inShelter ? 1 / 22 : -1 / 180));
  const power = clamp(player.power + dt * (inShelter ? 1 / 30 : player.scannerOn ? -1 / 145 : -1 / 600));
  const food = clamp(player.food - dt / 700);
  const health = clamp(player.health + dt * (inShelter ? .018 : air <= 0 ? -.045 : food <= 0 ? -.01 : 0));
  return { ...player, air, power, food, health, scannerOn: power > 0 && player.scannerOn };
}

export function interact(world: WorldState, targetId: string): WorldState {
  const item = world.items.find(candidate => candidate.id === targetId && candidate.available);
  if (!item || distance(world.player.position, item.position) > 3 || world.player.inventory.length >= 4) return world;
  const player = { ...world.player, inventory: [...world.player.inventory, { ...item, available: false }] };
  const items = world.items.map(candidate => candidate.id === item.id ? { ...candidate, available: false } : candidate);
  let creatures = world.creatures;
  if (item.kind === 'egg' && item.ownerSpecies) {
    creatures = world.creatures.map(creature => {
      if (creature.speciesId !== item.ownerSpecies || distance(creature.position, world.player.position) > 24) return creature;
      const remembered = applyMemoryEvent(creature, { id: `${item.id}:${creature.id}:stolen`, type: 'egg_stolen',
        creatureId: creature.id, otherId: 'player', at: world.time, position: world.player.position });
      return { ...remembered, currentIntent: null, decisionEpoch: remembered.decisionEpoch + 1, nextDecisionAt: world.time };
    });
  }
  return { ...world, player, items, creatures };
}

export function dropItem(world: WorldState, itemId: string): WorldState {
  const item = world.player.inventory.find(candidate => candidate.id === itemId);
  if (!item) return world;
  const player = { ...world.player, inventory: world.player.inventory.filter(candidate => candidate.id !== itemId) };
  const items = world.items.map(candidate => candidate.id === itemId
    ? { ...candidate, available: true, position: { ...world.player.position } } : candidate);
  const creatures = item.kind === 'egg' ? world.creatures.map(creature => creature.speciesId === item.ownerSpecies &&
    distance(creature.position, world.player.position) <= 24
    ? { ...creature, currentIntent: null, decisionEpoch: creature.decisionEpoch + 1, nextDecisionAt: world.time } : creature) : world.creatures;
  return { ...world, player, items, creatures };
}

export function useItem(world: WorldState, itemId: string): WorldState {
  const item = world.player.inventory.find(candidate => candidate.id === itemId);
  if (!item || item.kind !== 'egg') return world;
  return { ...world, player: { ...world.player,
    inventory: world.player.inventory.filter(candidate => candidate.id !== itemId),
    food: clamp(world.player.food + .55), health: clamp(world.player.health + .2), air: clamp(world.player.air + .08) } };
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
      ? { ...item, available: true, position: { ...world.player.position } } : item) };
}
