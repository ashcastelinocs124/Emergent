import { expect, it } from 'vitest';
import { createCityState, recordClaim, setAssumption } from '../src/city/state';
import { loadCitySave, writeCitySave, CITY_SAVE_KEY } from '../src/city/save';
it('round trips evidence and resident memory under a separate city key', () => {
  const storage = new Map<string, string>();
  const store = { getItem: (key: string) => storage.get(key) ?? null, setItem: (key: string, value: string) => { storage.set(key, value); } };
  let state = recordClaim(createCityState(), 'mechanic-power');
  state = setAssumption(state, 'power-cell', 'workshop', ['mechanic-power']);
  writeCitySave(store, state);
  expect(CITY_SAVE_KEY).not.toBe('alien-ecosystem:expedition:v1');
  expect(loadCitySave(store)).toEqual(state);
  storage.set(CITY_SAVE_KEY, '{oops');
  expect(loadCitySave(store)).toBeNull();
});

it('recovers a city save written before conversation statements and activity streaks existed', () => {
  const old = createCityState() as Partial<ReturnType<typeof createCityState>>;
  delete old.statements;
  delete old.conversations;
  const store = { getItem: () => JSON.stringify(old), setItem: () => {} };
  const recovered = loadCitySave(store);
  expect(recovered?.statements).toEqual([]);
  expect(recovered?.residents.mara.activityStreak).toBe(0);
  expect(recovered?.conversations.mara).toEqual([]);
});
