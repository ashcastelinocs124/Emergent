import { describe, expect, it } from 'vitest';
import { createCityState } from '../src/city/state';
import { requestCityChoice, validateCityChoiceInput } from '../server/city-jev';
import type { CityChoiceInput } from '../src/city/model';
const input: CityChoiceInput = { kind: 'dialogue', actorId: 'mara', epoch: 1, utterance: 'Where is a power cell?', state: createCityState(), options: [{ id: 'mechanic-power', description: 'Mara explains where the power cell is.' }, { id: 'clarify', description: 'Ask for clarification.' }] };
describe('city Jev choices', () => {
  it('rejects oversized utterances and unoffered authored choices', () => {
    expect(validateCityChoiceInput(input)).toBe(true);
    expect(validateCityChoiceInput({ ...input, utterance: 'x'.repeat(600) })).toBe(false);
    expect(validateCityChoiceInput({ ...input, options: [{ id: 'invented', description: 'Invent a clue' }] })).toBe(false);
  });
  it('maps Jev choice only to offered ID', async () => {
    const evaluator = async () => ({ answers: { intent: { choice: 'a0', confidence: .9, probabilities: {} } }, usage: { input_tokens: 4, output_tokens: 1 } });
    expect((await requestCityChoice(input, evaluator)).choiceId).toBe('mechanic-power');
    await expect(requestCityChoice(input, async () => ({ answers: { intent: { choice: 'a9', confidence: .9, probabilities: {} } }, usage: { input_tokens: 4, output_tokens: 1 } }))).rejects.toThrow('unoffered');
  });
});

it('gives a resident only personal memory and the question, while lead analysis sees player evidence', async () => {
  const state = { ...createCityState(), claims: [{ id: 'courier-power', speakerId: 'eli' as const, text: 'A rumor', materialId: 'power-cell' as const, locationId: 'transit-depot' as const, at: 0 }] };
  let dialogueState: Record<string, unknown> = {};
  const evaluator = async (request: { state: Record<string, unknown> }) => { dialogueState = request.state; return { answers: { intent: { choice: 'a0', confidence: .9, probabilities: {} } }, usage: { input_tokens: 1, output_tokens: 1 } }; };
  await requestCityChoice({ ...input, state }, evaluator);
  expect(dialogueState).not.toHaveProperty('claims');
  await requestCityChoice({ kind: 'lead', actorId: 'ship-computer', epoch: 1, state, options: [{ id: 'power-cell@transit-depot', description: 'A reported lead' }] }, evaluator);
  expect(dialogueState).toHaveProperty('claims');
});

it('rejects a lead that the player has not heard or observed', () => {
  expect(validateCityChoiceInput({ kind: 'lead', actorId: 'ship-computer', epoch: 1, state: createCityState(), options: [{ id: 'power-cell@workshop', description: 'Guess the true answer' }] })).toBe(false);
});

it('treats malformed resident memory as an invalid request instead of throwing', () => {
  const state = createCityState();
  delete (state.residents as Partial<typeof state.residents>).mara;
  expect(() => validateCityChoiceInput({ ...input, state })).not.toThrow();
  expect(validateCityChoiceInput({ ...input, state })).toBe(false);
});
