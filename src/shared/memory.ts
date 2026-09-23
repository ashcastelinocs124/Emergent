import type { CreatureEvent, CreatureState } from './model';

const dispositionChange = {
  fed: .3,
  threatened: -.2,
  injured: -.45,
  egg_stolen: -.55,
} as const;

export function applyMemoryEvent(creature: CreatureState, event: CreatureEvent): CreatureState {
  if (event.creatureId !== creature.id || !event.otherId || !(event.type in dispositionChange)) {
    return creature;
  }
  if (creature.memory.events.some(fact => fact.id === event.id)) return creature;
  const type = event.type as keyof typeof dispositionChange;
  const fact = { id: event.id, type, otherId: event.otherId, at: event.at };
  return {
    ...creature,
    memory: {
      events: [...creature.memory.events, fact].slice(-16),
      disposition: Math.max(-1, Math.min(1, creature.memory.disposition + dispositionChange[type])),
    },
  };
}
