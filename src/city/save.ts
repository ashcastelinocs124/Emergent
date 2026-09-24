import { materialIds, residentIds } from './content';
import type { CityState } from './model';
export const CITY_SAVE_KEY = 'alien-ecosystem:city:v1';
type Storage = Pick<globalThis.Storage, 'getItem' | 'setItem'>;
export function writeCitySave(storage: Storage, state: CityState): void { storage.setItem(CITY_SAVE_KEY, JSON.stringify(state)); }
export function loadCitySave(storage: Storage): CityState | null {
  try {
    const raw = storage.getItem(CITY_SAVE_KEY); if (!raw) return null;
    const state = JSON.parse(raw) as CityState;
    if (state.version !== 1 || !state.player || !Array.isArray(state.claims) || !Array.isArray(state.observations) || !Array.isArray(state.inventory) || !Array.isArray(state.installed) || !state.access || !state.residents || !residentIds.every(id => state.residents[id] && Array.isArray(state.residents[id].heard)) || !state.inventory.every(id => materialIds.includes(id))) return null;
    return { ...state,
      statements: Array.isArray(state.statements) ? state.statements : state.claims.map(({ id, speakerId, text, at }) => ({ id, speakerId, text, at })),
      conversations: Object.fromEntries(residentIds.map(id => [id, Array.isArray(state.conversations?.[id]) ? state.conversations[id].slice(-20) : []])) as CityState['conversations'],
      residents: Object.fromEntries(residentIds.map(id => [id, { ...state.residents[id], activityStreak: Number.isSafeInteger(state.residents[id].activityStreak) ? state.residents[id].activityStreak : 0 }])) as CityState['residents'],
    };
  } catch { return null; }
}
