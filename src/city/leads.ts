import { getAvailableLeads } from './decisions';
import type { CityState } from './model';
export function applyLeadChoice(state: CityState, choiceId: string): CityState {
  if (!getAvailableLeads(state).some(option => option.id === choiceId)) return state;
  return { ...state, lead: choiceId };
}
