import type { CreatureState, Intent, ItemKind, Vec3, WorldState } from './model';

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

const diet: Record<CreatureState['speciesId'], ItemKind[]> = {
  guardian: ['corpse'],
  grazer: ['spore'],
  stalker: ['corpse'],
};

export function getValidIntents(creature: CreatureState, world: WorldState): Intent[] {
  if (!creature.alive) return [];
  const intents: Intent[] = [];
  const playerDistance = distance(creature.position, world.player.position);
  const playerDetected = !world.player.hidden || playerDistance <= 6;

  if (creature.speciesId === 'guardian') {
    const nest = world.nests.find(candidate => candidate.speciesId === 'guardian' &&
      distance(creature.position, candidate.position) < candidate.radius + 10);
    const playerInTerritory = nest && distance(world.player.position, nest.position) <= nest.radius;
    const carryingGuardianEgg = world.player.inventory.some(item =>
      item.kind === 'egg' && item.ownerSpecies === 'guardian');
    if (playerInTerritory && playerDistance <= 24 && carryingGuardianEgg && playerDetected) {
      if (creature.health < .25) intents.push({ action: 'FLEE', targetId: 'player' });
      intents.push({ action: 'DEFEND', targetId: 'player' }, { action: 'FOLLOW', targetId: 'player' });
      return intents;
    }
    const remembersTheft = creature.memory.events.some(event =>
      event.type === 'egg_stolen' && event.otherId === 'player');
    if (playerDistance <= 24 && remembersTheft && playerDetected) {
      intents.push({ action: 'FOLLOW', targetId: 'player' });
      if (creature.fear > .5) intents.push({ action: 'HIDE' });
    }
  }

  for (const other of world.creatures) {
    if (other.id === creature.id || !other.alive) continue;
    const separation = distance(creature.position, other.position);
    if (creature.speciesId === 'grazer' && other.speciesId === 'stalker' && separation <= 18) {
      intents.push({ action: 'FLEE', targetId: other.id });
    }
    if (creature.speciesId === 'stalker' && other.speciesId === 'grazer' && separation <= 30) {
      intents.push({ action: 'HUNT', targetId: other.id });
    }
    if (creature.speciesId === 'stalker' && other.speciesId === 'guardian' && separation <= 14) {
      intents.push({ action: 'FLEE', targetId: other.id });
    }
    if (other.speciesId === creature.speciesId && separation <= 12 &&
      creature.mateDrive >= .8 && other.mateDrive >= .8) {
      intents.push({ action: 'MATE', targetId: other.id });
    }
    if (other.speciesId === creature.speciesId && separation <= 20 && creature.speciesId === 'grazer') {
      intents.push({ action: 'FOLLOW', targetId: other.id });
    }
  }

  if (creature.hunger >= .4) {
    for (const item of world.items) {
      if (item.available && diet[creature.speciesId].includes(item.kind) &&
        distance(creature.position, item.position) <= 28) {
        intents.push({ action: 'EAT', targetId: item.id });
      }
    }
  }
  if (creature.fear >= .7) intents.push({ action: 'HIDE' });
  intents.push({ action: 'EXPLORE' });
  return intents;
}
