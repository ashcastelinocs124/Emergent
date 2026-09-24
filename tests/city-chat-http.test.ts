import { expect, it } from 'vitest';
import { createApp } from '../server/app';
import type { DecisionInput } from '../src/shared/model';

const choice = async (request: DecisionInput) => ({ creatureId: request.creatureId, epoch: request.epoch, intent: request.intents[0] });
const body = { residentId: 'mara', utterance: 'Where is the power cell?', anchorId: 'mechanic-power', history: [] };

it('returns a resident reply through the chat endpoint and rejects a forged anchor', async () => {
  const app = createApp(choice, async () => ({ reply: 'It is in my workshop cabinet.', mode: 'simulated' as const }));
  const server = app.listen(0, '127.0.0.1');
  await new Promise<void>(resolve => server.once('listening', resolve));
  const address = server.address();
  if (!address || typeof address === 'string') throw new Error('Expected TCP address');
  const url = `http://127.0.0.1:${address.port}`;
  try {
    const valid = await fetch(`${url}/api/city-chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    expect(valid.status).toBe(200);
    expect(await valid.json()).toMatchObject({ reply: 'It is in my workshop cabinet.' });
    const forged = await fetch(`${url}/api/city-chat`, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ ...body, anchorId: 'courier-power' }) });
    expect(forged.status).toBe(400);
  } finally { await new Promise<void>(resolve => server.close(() => resolve())); }
});
