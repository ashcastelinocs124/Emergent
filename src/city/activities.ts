import { getValidActivities } from './decisions';
import type { CityState, ResidentId } from './model';
export function applyResidentActivity(state: CityState, id: ResidentId, activity: string, dialogueEpoch: number, nextDecisionAt: number): CityState {
  const resident = state.residents[id];
  if (resident.epoch !== dialogueEpoch || !getValidActivities(id, state).some(option => option.id === activity)) return state;
  return { ...state, residents: { ...state.residents, [id]: { ...resident, activity,
    activityStreak: activity === resident.activity ? resident.activityStreak + 1 : 1, nextDecisionAt } } };
}
