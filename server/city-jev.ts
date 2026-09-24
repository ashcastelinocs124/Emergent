import { TypeSafeClient, choice, type JsonValue } from '@typesafe-ai/sdk';
import { isAuthoredOption } from '../src/city/decisions';
import { residentIds, residents } from '../src/city/content';
import type { CityChoiceInput, CityChoiceResult } from '../src/city/model';
export type CityEvaluator = (request: { state: Record<string, unknown>; questions: { intent: { instructions: string; criteria: Record<string, string> } } }) => Promise<{ answers: { intent: { choice: string; confidence: number; probabilities: Record<string, number> } }; usage: { input_tokens: number; output_tokens: number } }>;
let client: TypeSafeClient | undefined;
const live: CityEvaluator = async request => {
  const key = process.env.TYPESAFE_API_KEY;
  if (!key) throw new Error('TYPESAFE_API_KEY is not configured');
  client ??= new TypeSafeClient({ apiKey: key, timeout: 4500, retry: { maxRetries: 0 }, logLevel: 'error' });
  return client.systemOne({ state: request.state as Record<string, JsonValue>, questions: { intent: choice(request.questions.intent.instructions, request.questions.intent.criteria) } });
};
export function validateCityChoiceInput(value: unknown): value is CityChoiceInput {
  try {
    if (!value || typeof value !== 'object') return false;
    const input = value as CityChoiceInput;
    if (!['dialogue', 'activity', 'lead'].includes(input.kind) || typeof input.actorId !== 'string' || input.actorId.length > 49 ||
      !Number.isSafeInteger(input.epoch) || input.epoch < 0 ||
      (input.kind === 'dialogue' && (typeof input.utterance !== 'string' || !input.utterance.trim() || input.utterance.length > 240)) ||
      (input.utterance !== undefined && (typeof input.utterance !== 'string' || input.utterance.length > 240)) ||
      !input.state || input.state.version !== 1 || !input.state.player || !Array.isArray(input.state.claims) ||
      !Array.isArray(input.state.observations) || !input.state.residents ||
      !residentIds.every(id => input.state.residents[id] && Array.isArray(input.state.residents[id].heard) && input.state.residents[id].position) ||
      !Array.isArray(input.options) || input.options.length < 1 || input.options.length > 20) return false;
    return input.options.every(option => option && typeof option.id === 'string' && typeof option.description === 'string' &&
      option.description.length <= 350 && isAuthoredOption(input, option.id));
  } catch { return false; }
}
export async function requestCityChoice(input: CityChoiceInput, evaluate: CityEvaluator = live): Promise<CityChoiceResult> {
  if (!validateCityChoiceInput(input)) throw new Error('Invalid city choice');
  const personal = input.actorId in residents ? input.state.residents[input.actorId as keyof typeof input.state.residents] : undefined;
  const snapshot: Record<string, unknown> = { kind: input.kind, actor: input.actorId, time: input.state.time,
    role: input.actorId in residents ? residents[input.actorId as keyof typeof residents].role : 'ship computer',
    activity: personal?.activity ?? 'analyze', memory: personal?.heard ?? [],
    playerNearby: personal ? Math.hypot(personal.position.x - input.state.player.x, personal.position.z - input.state.player.z) < 10 : false };
  if (input.kind === 'dialogue') snapshot.utterance = input.utterance ?? '';
  if (input.kind === 'lead') Object.assign(snapshot, { claims: input.state.claims.map(claim => ({ speaker: claim.speakerId, material: claim.materialId, location: claim.locationId })),
    assumptions: input.state.assumptions, observations: input.state.observations, inventory: input.state.inventory, installed: input.state.installed });
  const request = { state: snapshot,
    questions: { intent: { instructions: input.kind === 'dialogue'
      ? 'Select the most relevant offered answer to the visitor question. If none answers it, choose clarify. Choose only an offered option.'
      : input.kind === 'activity' ? 'Choose a plausible next individual activity for this resident. Choose only an offered option.'
      : 'Choose a useful evidence-backed lead. Contradictions reduce confidence; choose seek-more-evidence when clues are too weak. Choose only an offered option.',
      criteria: Object.fromEntries(input.options.map((option, index) => [`a${index}`, option.description])) } } };
  const started = performance.now();
  const reply = await evaluate(request);
  const index = /^a\d+$/.test(reply.answers.intent.choice) ? Number(reply.answers.intent.choice.slice(1)) : -1;
  const selected = input.options[index];
  if (!selected) throw new Error('Jev returned an unoffered city choice');
  return { actorId: input.actorId, epoch: input.epoch, choiceId: selected.id, elapsedMs: performance.now() - started,
    usage: { inputTokens: reply.usage.input_tokens, outputTokens: reply.usage.output_tokens } };
}
export async function fakeCityChoice(input: CityChoiceInput): Promise<CityChoiceResult> {
  const selected = input.options.find(option => option.id !== 'clarify' && option.id !== 'seek-more-evidence') ?? input.options[0];
  return { actorId: input.actorId, epoch: input.epoch, choiceId: selected.id, elapsedMs: 0, usage: { inputTokens: 0, outputTokens: 0 } };
}
