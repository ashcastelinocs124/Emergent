import type { WorldState } from '../shared/model';
import type { Journal } from '../shared/journal';
import { loadSave, serializeSave } from '../shared/save';

const CURRENT = 'alien-ecosystem:expedition:v1';
const PREVIOUS = 'alien-ecosystem:expedition:previous:v1';

export interface Persistence {
  write(world: WorldState, journal: Journal): void;
  load(): { world: WorldState; journal: Journal } | null;
  clear(): void;
}

export function createPersistence(storage: Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>): Persistence {
  return {
    write(world, journal) {
      const current = storage.getItem(CURRENT);
      if (current) {
        try { loadSave(current); storage.setItem(PREVIOUS, current); } catch { /* preserve older valid snapshot */ }
      }
      storage.setItem(CURRENT, serializeSave(world, journal));
    },
    load() {
      const current = storage.getItem(CURRENT);
      if (current) {
        try { return loadSave(current); } catch { /* fall back to last valid snapshot */ }
      }
      const previous = storage.getItem(PREVIOUS);
      if (previous) return loadSave(previous);
      if (current) throw new Error('Expedition save is damaged. Start a new expedition from the title screen.');
      return null;
    },
    clear() { storage.removeItem(CURRENT); storage.removeItem(PREVIOUS); },
  };
}
