import type { CreatureEvent, CreatureState, DecisionResult, Intent, ItemState, Vec3, WorldState } from '../shared/model';
import { getValidIntents } from '../shared/species';

const distance = (a: Vec3, b: Vec3): number => Math.hypot(a.x - b.x, a.z - b.z);
const clamp = (value: number): number => Math.max(0, Math.min(1, value));
const speed = { guardian: 3.1, grazer: 4.3, stalker: 5.2 };

function move(creature: CreatureState, target: Vec3, dt: number, away = false): void {
  const dx = target.x - creature.position.x;
  const dz = target.z - creature.position.z;
  const length = Math.hypot(dx, dz);
  if (length < .001) return;
  const step = Math.min(speed[creature.speciesId] * dt, away ? speed[creature.speciesId] * dt : length);
  const sign = away ? -1 : 1;
  creature.position.x = Math.max(-145, Math.min(145, creature.position.x + dx / length * step * sign));
  creature.position.z = Math.max(-145, Math.min(145, creature.position.z + dz / length * step * sign));
}

function finish(creature: CreatureState, now: number): void {
  creature.currentIntent = null;
  creature.actionEndsAt = now;
  creature.nextDecisionAt = now;
  creature.decisionEpoch++;
}

export function stepWorld(world: WorldState, dt: number): { world: WorldState; events: CreatureEvent[] } {
  const next: WorldState = {
    ...world, time: world.time + dt,
    player: { ...world.player, position: { ...world.player.position }, inventory: [...world.player.inventory] },
    creatures: world.creatures.map(creature => ({ ...creature, position: { ...creature.position } })),
    items: world.items.map(item => ({ ...item, position: { ...item.position } })),
  };
  const events: CreatureEvent[] = [];
  const emit = (type: CreatureEvent['type'], creature: CreatureState, otherId?: string) => {
    events.push({ id: `${creature.id}:${creature.decisionEpoch}:${type}:${next.time.toFixed(3)}`, type,
      creatureId: creature.id, otherId, at: next.time, position: { ...creature.position } });
  };
  const targetPosition = (id?: string): Vec3 | undefined => {
    if (!id) return undefined;
    if (id === 'player') return next.player.position;
    return next.creatures.find(creature => creature.id === id && creature.alive)?.position ??
      next.items.find(item => item.id === id && item.available)?.position;
  };

  for (const creature of next.creatures) {
    if (!creature.alive) continue;
    creature.hunger = clamp(creature.hunger + dt * .0015);
    creature.mateDrive = clamp(creature.mateDrive + dt * .0004);
    const intent = creature.currentIntent;
    if (!intent) continue;
    const target = targetPosition(intent.targetId);
    if (next.time >= creature.actionEndsAt || (intent.targetId && !target)) {
      finish(creature, next.time);
      continue;
    }
    switch (intent.action) {
      case 'HUNT':
      case 'DEFEND':
        if (target) {
          move(creature, target, dt);
          if (distance(creature.position, target) <= 1.4) {
            emit('attacked', creature, intent.targetId);
            const victim = next.creatures.find(other => other.id === intent.targetId);
            if (victim) {
              victim.health = clamp(victim.health - .28);
              if (victim.health === 0) {
                victim.alive = false;
                emit('died', victim, creature.id);
                next.items.push({ id: `corpse-${victim.id}-${next.time.toFixed(2)}`, kind: 'corpse', position: { ...victim.position }, available: true });
              }
            } else if (intent.targetId === 'player') next.player.health = clamp(next.player.health - .15);
            finish(creature, next.time);
          }
        }
        break;
      case 'FLEE':
        if (target) move(creature, target, dt, true);
        break;
      case 'EAT': {
        if (!target) break;
        move(creature, target, dt);
        if (distance(creature.position, target) <= 1.3) {
          const food = next.items.find(item => item.id === intent.targetId && item.available);
          if (food) {
            food.available = false;
            creature.hunger = clamp(creature.hunger - .6);
            emit('ate', creature, food.id);
            finish(creature, next.time);
          }
        }
        break;
      }
      case 'MATE': {
        const partner = next.creatures.find(other => other.id === intent.targetId && other.alive && other.speciesId === creature.speciesId && other.mateDrive >= .8);
        if (!partner) { finish(creature, next.time); break; }
        move(creature, partner.position, dt);
        if (distance(creature.position, partner.position) <= 1.5) {
          creature.mateDrive = 0;
          partner.mateDrive = 0;
          emit('mated', creature, partner.id);
          finish(creature, next.time);
        }
        break;
      }
      case 'FOLLOW':
        if (target && distance(creature.position, target) > 3) move(creature, target, dt);
        break;
      case 'EXPLORE': {
        const phase = creature.id.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0);
        const waypoint = { x: Math.sin(phase * 1.71 + creature.decisionEpoch * 2.4) * 95,
          y: 0, z: Math.cos(phase * 1.13 + creature.decisionEpoch * 2.4) * 95 };
        if (distance(waypoint, next.shipPosition) > 8) move(creature, waypoint, dt);
        break;
      }
      case 'HIDE':
        creature.fear = clamp(creature.fear - dt * .025);
        break;
    }
  }
  return { world: next, events };
}

export function applyDecision(world: WorldState, result: DecisionResult): WorldState {
  const creature = world.creatures.find(candidate => candidate.id === result.creatureId);
  if (!creature || !creature.alive || creature.currentIntent || creature.decisionEpoch !== result.epoch) return world;
  const offered = getValidIntents(creature, world);
  if (!offered.some(intent => intent.action === result.intent.action && intent.targetId === result.intent.targetId)) return world;
  const durations: Record<Intent['action'], number> = {
    HUNT: 8, FLEE: 5, HIDE: 7, EAT: 10, FOLLOW: 6, DEFEND: 8, MATE: 7, EXPLORE: 9,
  };
  return { ...world, creatures: world.creatures.map(candidate => candidate.id === creature.id
    ? { ...candidate, currentIntent: { ...result.intent }, actionEndsAt: world.time + durations[result.intent.action], nextDecisionAt: world.time + durations[result.intent.action] }
    : candidate) };
}

function random(seed: number): () => number {
  let state = seed >>> 0;
  return () => { state = (Math.imul(state, 1664525) + 1013904223) >>> 0; return state / 4294967296; };
}

export function createInitialWorld(seed: number, shipPosition: Vec3, nestPosition: Vec3, creatureCount = 30): WorldState {
  const rng = random(seed);
  const creatures: CreatureState[] = [];
  const species = ['guardian', 'grazer', 'stalker'] as const;
  for (const kind of species) for (let i = 0; i < (Math.floor(creatureCount / 3) + (species.indexOf(kind) < creatureCount % 3 ? 1 : 0)); i++) {
    let position: Vec3;
    do {
      const center = kind === 'guardian' ? nestPosition : kind === 'grazer' ? { x: 5, y: 0, z: -28 } : { x: 42, y: 0, z: -12 };
      position = { x: center.x + (rng() - .5) * 45, y: 0, z: center.z + (rng() - .5) * 45 };
    } while (distance(position, shipPosition) <= 8);
    creatures.push({ id: `${kind}-${i + 1}`, speciesId: kind, position, alive: true, health: 1,
      hunger: .25 + rng() * .6, fear: 0, mateDrive: rng(), memory: { events: [], disposition: 0 },
      currentIntent: null, actionEndsAt: 0, nextDecisionAt: .12 + creatures.length * .22,
      decisionEpoch: 0 });
  }
  const items: ItemState[] = Array.from({ length: 24 }, (_, i) => ({ id: `spore-${i + 1}`, kind: 'spore' as const,
    position: { x: -20 + rng() * 75, y: 0, z: -60 + rng() * 65 }, available: true }));
  for (let i = 0; i < 5; i++) items.push({ id: `egg-${i + 1}`, kind: 'egg', ownerSpecies: 'guardian',
    position: { x: nestPosition.x + Math.cos(i * 2.4) * 2.2, y: 0, z: nestPosition.z + Math.sin(i * 2.4) * 2.2 }, available: true });
  items.push({ id: 'ship-component', kind: 'component', position: { x: nestPosition.x + 19.1, y: 0, z: nestPosition.z + 13.6 }, available: true });
  return { time: 0, player: { id: 'player', position: { ...shipPosition }, inventory: [], air: 1, power: 1,
    food: 1, health: 1, hidden: false, scannerOn: false }, creatures, items,
    nests: [{ id: 'guardian-nest', speciesId: 'guardian', position: { ...nestPosition }, radius: 16 }],
    shipPosition: { ...shipPosition }, componentInstalled: false };
}
