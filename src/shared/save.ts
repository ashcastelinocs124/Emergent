import type { WorldState } from './model';
import type { Journal } from './journal';

const VERSION = 1;
const damaged = () => new Error('Save data is damaged. Restore the previous save or start a new expedition.');
const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object' && !Array.isArray(value);
const point = (value: unknown): boolean => record(value) && typeof value.x === 'number' &&
  typeof value.y === 'number' && typeof value.z === 'number';

export function serializeSave(world: WorldState, journal: Journal): string {
  return JSON.stringify({ version: VERSION, world, journal });
}

export function loadSave(raw: string): { world: WorldState; journal: Journal } {
  let parsed: unknown;
  try { parsed = JSON.parse(raw) as unknown; } catch { throw damaged(); }
  if (!record(parsed)) throw damaged();
  if (typeof parsed.version === 'number' && parsed.version > VERSION)
    throw new Error('This save was created by a newer version of Alien Ecosystem. Update the game to load it.');
  if (parsed.version !== VERSION || !record(parsed.world) || !record(parsed.journal)) throw damaged();
  const world = parsed.world;
  const journal = parsed.journal;
  if (typeof world.time !== 'number' || !record(world.player) || !point(world.player.position) ||
    !Array.isArray(world.player.inventory) || !Array.isArray(world.creatures) || !Array.isArray(world.items) ||
    !Array.isArray(world.nests) || !point(world.shipPosition) || typeof world.componentInstalled !== 'boolean' ||
    typeof world.player.air !== 'number' || typeof world.player.power !== 'number' ||
    typeof world.player.health !== 'number' || !Array.isArray(journal.observations) || !Array.isArray(journal.hypotheses)) throw damaged();
  if (!world.creatures.every(creature => record(creature) && typeof creature.id === 'string' &&
    point(creature.position) && record(creature.memory) && Array.isArray(creature.memory.events) &&
    typeof creature.decisionEpoch === 'number')) throw damaged();
  if (!world.items.every(item => record(item) && typeof item.id === 'string' && point(item.position))) throw damaged();
  return { world: world as unknown as WorldState, journal: journal as unknown as Journal };
}
