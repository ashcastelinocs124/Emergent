import { describe, expect, test } from 'vitest';
import { createApp } from '../server/app';
import type { DecisionInput } from '../src/shared/model';
import { creature, world } from './fixtures';

const input: DecisionInput = {
  creatureId: 'g1', epoch: 1, world: world([creature('g1', 'guardian')]), intents: [{ action: 'EXPLORE' }],
};

async function withServer(app: ReturnType<typeof createApp>, run: (url: string) => Promise<void>): Promise<void> {
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  try { await run(`http://127.0.0.1:${address.port}`); }
  finally { await new Promise<void>(resolve => server.close(() => resolve())); }
}

describe('decision HTTP boundary', () => {
  test('returns the chosen intent for a valid request', async () => {
    await withServer(createApp(async request => ({ creatureId: request.creatureId, epoch: request.epoch, intent: request.intents[0] })), async url => {
      const response = await fetch(`${url}/api/decision`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
      expect(response.status).toBe(200);
      expect(await response.json()).toMatchObject({ creatureId: 'g1', intent: { action: 'EXPLORE' } });
    });
  });

  test('rejects malformed intent lists without calling Jev', async () => {
    await withServer(createApp(async () => { throw new Error('must not run'); }), async url => {
      const response = await fetch(`${url}/api/decision`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...input, intents: [] }) });
      expect(response.status).toBe(400);
    });
  });

  test('reports service failure as unavailable', async () => {
    await withServer(createApp(async () => { throw new Error('upstream failed'); }), async url => {
      const response = await fetch(`${url}/api/decision`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(input) });
      expect(response.status).toBe(503);
    });
  });
});
