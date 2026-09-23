import express, { type Express } from 'express';
import type { DecisionInput, DecisionResult } from '../src/shared/model';
import { getValidIntents } from '../src/shared/species';
import { requestDecision } from './jev';
import { fakeDecision } from './fake-jev';
import { pathToFileURL } from 'node:url';
import { resolve } from 'node:path';

const ACTIONS = new Set(['HUNT', 'FLEE', 'HIDE', 'EAT', 'FOLLOW', 'DEFEND', 'MATE', 'EXPLORE']);

function isDecisionInput(value: unknown): value is DecisionInput {
  if (!value || typeof value !== 'object') return false;
  const input = value as Partial<DecisionInput>;
  if (typeof input.creatureId !== 'string' || !Number.isSafeInteger(input.epoch) ||
    !Array.isArray(input.intents) || input.intents.length < 1 || input.intents.length > 255) return false;
  if (!input.world || typeof input.world !== 'object' || !Array.isArray(input.world.creatures) ||
    !Array.isArray(input.world.items) || !Array.isArray(input.world.nests) || !input.world.player) return false;
  if (!input.intents.every(intent => intent && ACTIONS.has(intent.action) &&
    (intent.targetId === undefined || typeof intent.targetId === 'string'))) return false;
  const creature = input.world.creatures.find(candidate => candidate.id === input.creatureId);
  if (!creature) return false;
  try {
    const valid = getValidIntents(creature, input.world);
    return input.intents.every(intent => valid.some(candidate =>
      candidate.action === intent.action && candidate.targetId === intent.targetId));
  } catch {
    return false;
  }
}

export function createApp(decide: (input: DecisionInput) => Promise<DecisionResult>): Express {
  const app = express();
  app.use(express.json({ limit: '64kb' }));
  app.get('/api/health', (_request, response) => {
    if (process.env.JEV_MODE !== 'fake' && !process.env.TYPESAFE_API_KEY) {
      response.status(503).json({ status: 'unavailable', mode: 'live', error: 'TYPESAFE_API_KEY is not configured' });
      return;
    }
    response.json({ status: 'ready', mode: process.env.JEV_MODE === 'fake' ? 'fake' : 'live' });
  });
  app.post('/api/decision', async (request, response) => {
    if (!isDecisionInput(request.body)) {
      response.status(400).json({ error: 'Invalid decision request' });
      return;
    }
    try {
      const result = await decide(request.body);
      if (result.creatureId !== request.body.creatureId || result.epoch !== request.body.epoch ||
        !request.body.intents.some((intent: DecisionInput['intents'][number]) =>
          intent.action === result.intent.action && intent.targetId === result.intent.targetId)) {
        response.status(503).json({ error: 'Decision service returned an invalid result' });
        return;
      }
      response.json(result);
    } catch {
      response.status(503).json({ error: 'Decision service unavailable' });
    }
  });
  return app;
}

const isMain = process.argv[1] && pathToFileURL(resolve(process.argv[1])).href === import.meta.url;
if (isMain) {
  const decide = process.env.JEV_MODE === 'fake' ? fakeDecision : requestDecision;
  createApp(decide).listen(8787, '127.0.0.1', () => {
    console.log(`Decision service listening on http://127.0.0.1:8787 (${process.env.JEV_MODE === 'fake' ? 'FAKE TEST MODE' : 'Jev'})`);
  });
}
