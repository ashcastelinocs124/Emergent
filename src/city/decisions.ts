import { residents, responses, materials } from './content';
import type { CityChoiceInput, CityChoiceOption, CityState, ResidentId } from './model';
export const activityIds = ['work', 'walk', 'watch', 'rest'] as const;
const routines: Record<ResidentId, Record<(typeof activityIds)[number], string>> = {
  mara: { work: 'repair a motor at Voss Auto', walk: 'walk the workshop frontage', watch: 'inspect the crash lot from the curb', rest: 'take a break outside the workshop' },
  eli: { work: 'sort deliveries by the crossing', walk: 'make a short courier round', watch: 'check the traffic and strangers', rest: 'pause at the transit bench' },
  sora: { work: 'sort salvage at the yard', walk: 'search the open scrap rows', watch: 'keep an eye on the crash lot', rest: 'rest by the salvage gate' },
  dev: { work: 'maintain the depot equipment', walk: 'inspect the platform edge', watch: 'watch the arriving traffic', rest: 'take a break beside the depot' },
};
export function getValidActivities(id: ResidentId, state: CityState): CityChoiceOption[] {
  const current = state.residents[id];
  return activityIds.filter(activity => activity !== current.activity || current.activityStreak < 3)
    .map(activity => ({ id: activity, description: `${residents[id].name}, the ${residents[id].role.toLowerCase()}, may ${routines[id][activity]}. Current activity: ${current.activity}.` }));
}
export function getDialogueOptions(id: ResidentId, utterance: string, state: CityState): CityChoiceOption[] {
  const words: string[] = utterance.toLowerCase().match(/[a-z]+/g) ?? [];
  const matched = Object.entries(responses).filter(([responseId, reply]) => reply.speakerId === id && (responseId !== 'mechanic-power' || !state.residents[id].heard.includes('mechanic-power')) && (!reply.after || state.residents[id].heard.includes(reply.after)) && reply.keywords.some(keyword => words.includes(keyword)));
  const options = matched.map(([responseId, reply]) => ({ id: responseId, description: `${reply.text}${state.residents[id].heard.includes(responseId) ? ' You have said this before.' : ''}` }));
  return [...options, { id: 'clarify', description: 'The question is unclear or unrelated; ask for a specific topic.' }];
}
export function getAvailableLeads(state: CityState): CityChoiceOption[] {
  const leads = state.claims.map(claim => ({ id: `${claim.materialId}@${claim.locationId}`, description: `${materials[claim.materialId].name} may be at ${claim.locationId}; reported by ${residents[claim.speakerId].name}.` }));
  return [...new Map(leads.map(lead => [lead.id, lead])).values(), { id: 'seek-more-evidence', description: 'There is not enough reliable evidence yet; talk to more residents.' }];
}
export function isAuthoredOption(input: CityChoiceInput, optionId: string): boolean {
  if (input.kind === 'dialogue') return optionId === 'clarify' || (input.actorId in residents && getDialogueOptions(input.actorId as ResidentId, input.utterance ?? '', input.state).some(option => option.id === optionId));
  if (input.kind === 'activity') return input.actorId in residents && getValidActivities(input.actorId as ResidentId, input.state).some(option => option.id === optionId);
  if (input.kind === 'lead') return input.actorId === 'ship-computer' && getAvailableLeads(input.state).some(option => option.id === optionId);
  return false;
}
