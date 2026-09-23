import type { DecisionInput, DecisionResult } from '../src/shared/model';

export async function fakeDecision(input: DecisionInput): Promise<DecisionResult> {
  const intent = input.intents.find(candidate => candidate.action === 'DEFEND' && candidate.targetId === 'player')
    ?? input.intents.find(candidate => candidate.action === 'EAT')
    ?? input.intents[0];
  if (!intent) throw new Error('No valid intents offered');
  return { creatureId: input.creatureId, epoch: input.epoch, intent, elapsedMs: 0, usage: { inputTokens: 0, outputTokens: 0 } };
}
