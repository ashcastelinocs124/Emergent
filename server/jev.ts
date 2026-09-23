import { TypeSafeClient, choice, type JsonValue } from '@typesafe-ai/sdk';
import type { DecisionInput, DecisionResult, Intent, Vec3 } from '../src/shared/model';

export type JevRequest = {
  state: Record<string, unknown>;
  questions: { intent: { type: 'choice'; instructions: string; criteria: Record<string, string> } };
};
export type JevReply = {
  model: string;
  answers: { intent: { type: 'choice'; choice: string; confidence: number; probabilities: Record<string, number> } };
  usage: { input_tokens: number; output_tokens: number };
};
export type JevEvaluator = (request: JevRequest) => Promise<JevReply>;

function distance(a: Vec3, b: Vec3): number {
  return Math.hypot(a.x - b.x, a.z - b.z);
}

function describeIntent(intent: Intent): string {
  return intent.targetId ? `${intent.action} toward ${intent.targetId}` : intent.action;
}

export function createLiveEvaluator(apiKey: string | undefined): JevEvaluator {
  if (!apiKey?.trim()) throw new Error('TYPESAFE_API_KEY is required for live Jev decisions');
  const client = new TypeSafeClient({ apiKey, timeout: 4500, retry: { maxRetries: 0 }, logLevel: 'error' });
  return async request => client.systemOne({
    state: request.state as Record<string, JsonValue>,
    questions: { intent: choice(request.questions.intent.instructions, request.questions.intent.criteria) },
  });
}

let sharedLiveEvaluator: JevEvaluator | undefined;

function buildRequest(input: DecisionInput): JevRequest {
  const creature = input.world.creatures.find(candidate => candidate.id === input.creatureId);
  if (!creature) throw new Error('Creature missing from decision snapshot');
  const criteria = Object.fromEntries(input.intents.map((intent, index) => [`a${index}`, describeIntent(intent)]));
  const nearbyCreatures = input.world.creatures
    .filter(candidate => candidate.id !== creature.id && candidate.alive && distance(candidate.position, creature.position) <= 40)
    .map(candidate => ({ id: candidate.id, speciesId: candidate.speciesId, position: candidate.position, action: candidate.currentIntent?.action ?? 'none' }));
  const nearbyItems = input.world.items
    .filter(item => item.available && distance(item.position, creature.position) <= 40)
    .map(item => ({ id: item.id, kind: item.kind, position: item.position }));
  return {
    state: {
      time: input.world.time,
      creature: {
        id: creature.id, speciesId: creature.speciesId, position: creature.position,
        health: creature.health, hunger: creature.hunger, fear: creature.fear,
        mateDrive: creature.mateDrive, memory: creature.memory,
      },
      player: {
        position: input.world.player.position, hidden: input.world.player.hidden,
        carriedEggs: input.world.player.inventory.filter(item => item.kind === 'egg').map(item => item.ownerSpecies ?? 'unknown'),
      },
      nearbyCreatures,
      nearbyItems,
      nests: input.world.nests.filter(nest => distance(nest.position, creature.position) <= 40),
    },
    questions: {
      intent: {
        type: 'choice',
        instructions: 'Given this creature and its current surroundings, which offered intent should it attempt next? Choose only an offered intent.',
        criteria,
      },
    },
  };
}

export async function requestDecision(
  input: DecisionInput,
  evaluate: JevEvaluator = sharedLiveEvaluator ??= createLiveEvaluator(process.env.TYPESAFE_API_KEY),
  timeoutMs = 5000,
): Promise<DecisionResult> {
  if (input.intents.length < 1 || input.intents.length > 255) throw new Error('Invalid intent count');
  const request = buildRequest(input);
  const started = performance.now();
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    const response = await Promise.race([
      evaluate(request),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error('Jev decision timed out')), timeoutMs);
      }),
    ]);
    const selected = /^a\d+$/.test(response.answers.intent.choice)
      ? input.intents[Number(response.answers.intent.choice.slice(1))]
      : undefined;
    if (!selected) throw new Error('Jev returned an unoffered intent');
    return {
      creatureId: input.creatureId,
      epoch: input.epoch,
      intent: selected,
      elapsedMs: performance.now() - started,
      usage: { inputTokens: response.usage.input_tokens, outputTokens: response.usage.output_tokens },
    };
  } finally {
    if (timer) clearTimeout(timer);
  }
}
