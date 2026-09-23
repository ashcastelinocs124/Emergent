import { describe, expect, test } from 'vitest';
import { createLiveEvaluator, requestDecision } from '../server/jev';
import { fakeDecision } from '../server/fake-jev';
import type { DecisionInput } from '../src/shared/model';
import { creature, world } from './fixtures';

const input: DecisionInput = {
  creatureId: 'g1', epoch: 4, world: world([creature('g1', 'guardian')]),
  intents: [{ action: 'EXPLORE' }, { action: 'DEFEND', targetId: 'player' }],
};

function reply(choiceKey: string) {
  return {
    model: 'jev-test',
    answers: { intent: { type: 'choice' as const, choice: choiceKey, confidence: .8, probabilities: { a0: .2, a1: .8 } } },
    usage: { input_tokens: 120, output_tokens: 12 },
  };
}

describe('Jev decision adapter', () => {
  test('maps a typed Choice result to an offered creature intent', async () => {
    let sent: unknown;
    const result = await requestDecision(input, async request => {
      sent = request;
      return reply('a1');
    });
    expect(result).toMatchObject({ creatureId: 'g1', epoch: 4, intent: { action: 'DEFEND', targetId: 'player' }, usage: { inputTokens: 120, outputTokens: 12 } });
    expect(sent).toMatchObject({
      questions: { intent: { type: 'choice', criteria: { a0: expect.any(String), a1: expect.any(String) } } },
      state: { creature: { id: 'g1', speciesId: 'guardian' } },
    });
  });

  test('rejects an answer outside the offered intent list', async () => {
    await expect(requestDecision(input, async () => reply('a9'))).rejects.toThrow('unoffered intent');
  });

  test('times out a stuck Jev request', async () => {
    await expect(requestDecision(input, () => new Promise(() => {}), 5)).rejects.toThrow('timed out');
  });

  test('requires a server-side API key for live evaluation', () => {
    expect(() => createLiveEvaluator(undefined)).toThrow('TYPESAFE_API_KEY');
  });
});

test('test adapter chooses defense, then food, then the first offered intent', async () => {
  const defense = await fakeDecision(input);
  expect(defense.intent).toEqual({ action: 'DEFEND', targetId: 'player' });
  const eating = await fakeDecision({ ...input, intents: [{ action: 'EXPLORE' }, { action: 'EAT', targetId: 'food-1' }] });
  expect(eating.intent).toEqual({ action: 'EAT', targetId: 'food-1' });
  const exploring = await fakeDecision({ ...input, intents: [{ action: 'EXPLORE' }] });
  expect(exploring.intent).toEqual({ action: 'EXPLORE' });
});
