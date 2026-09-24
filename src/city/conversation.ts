import { responses } from './content';
import { recordClaim } from './state';
import type { CityState, ResidentId } from './model';
export function applyDialogueChoice(state: CityState, id: ResidentId, choiceId: string, epoch: number): CityState {
  if (state.residents[id].epoch !== epoch || choiceId === 'clarify' || responses[choiceId]?.speakerId !== id) return state;
  const updated = recordClaim(state, choiceId);
  return { ...updated, residents: { ...updated.residents, [id]: { ...updated.residents[id], epoch: epoch + 1,
    heard: updated.residents[id].heard.includes(choiceId) ? updated.residents[id].heard : [...updated.residents[id].heard, choiceId] } } };
}
