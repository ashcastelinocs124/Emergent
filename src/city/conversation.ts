import { responses } from './content';
import { recordClaim } from './state';
import type { CityState, ResidentId } from './model';
export function recordDialogueExchange(state: CityState, id: ResidentId, question: string, reply: string, anchorId: string): CityState {
  const grounded = applyDialogueChoice(state, id, anchorId, state.residents[id].epoch);
  const history = [...(grounded.conversations[id] ?? []), { speaker: 'player' as const, text: question, at: state.time }, { speaker: 'resident' as const, text: reply, at: state.time, anchorId: anchorId === 'clarify' ? undefined : anchorId }].slice(-20);
  return { ...grounded, conversations: { ...grounded.conversations, [id]: history } };
}
export function applyDialogueChoice(state: CityState, id: ResidentId, choiceId: string, epoch: number): CityState {
  if (state.residents[id].epoch !== epoch || choiceId === 'clarify' || responses[choiceId]?.speakerId !== id) return state;
  const updated = recordClaim(state, choiceId);
  return { ...updated, residents: { ...updated.residents, [id]: { ...updated.residents[id], epoch: epoch + 1,
    heard: updated.residents[id].heard.includes(choiceId) ? updated.residents[id].heard : [...updated.residents[id].heard, choiceId] } } };
}
