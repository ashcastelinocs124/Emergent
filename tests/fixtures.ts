import type { CreatureState, SpeciesId, Vec3, WorldState } from '../src/shared/model';

export const at = (x: number, z: number): Vec3 => ({ x, y: 0, z });

export function creature(id: string, speciesId: SpeciesId, position = at(0, 0)): CreatureState {
  return {
    id, speciesId, position, alive: true, health: 1, hunger: .5, fear: 0,
    mateDrive: 0, memory: { events: [], disposition: 0 }, currentIntent: null,
    actionEndsAt: 0, nextDecisionAt: 0, decisionEpoch: 0,
  };
}

export function world(creatures: CreatureState[]): WorldState {
  return {
    time: 10,
    player: {
      id: 'player', position: at(4, 0), inventory: [], air: 1, power: 1,
      food: 1, health: 1, hidden: false, scannerOn: false,
    },
    creatures,
    items: [],
    nests: [{ id: 'nest-1', speciesId: 'guardian', position: at(0, 0), radius: 16 }],
    shipPosition: at(-20, 10),
    componentInstalled: false,
  };
}
