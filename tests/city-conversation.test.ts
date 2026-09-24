import { expect, it } from 'vitest';
import { createCityState } from '../src/city/state';
import { getDialogueOptions } from '../src/city/decisions';
import { applyDialogueChoice } from '../src/city/conversation';
it('matches a mechanic power question, remembers it, and does not record clarification', () => {
  let state = createCityState();
  expect(getDialogueOptions('mara', 'Where can I get a power cell?', state).map(option => option.id)).toContain('mechanic-power');
  state = applyDialogueChoice(state, 'mara', 'mechanic-power', 0);
  expect(state.claims).toHaveLength(1);
  expect(state.residents.mara.heard).toContain('mechanic-power');
  expect(applyDialogueChoice(state, 'mara', 'clarify', 0)).toBe(state);
  expect(applyDialogueChoice(state, 'mara', 'mechanic-power', 999)).toBe(state);
});

it('an individual resident changes their offered answer after a prior encounter', () => {
  const before = createCityState();
  expect(getDialogueOptions('mara', 'power cell', before).map(option => option.id)).not.toContain('mechanic-power-repeat');
  const after = applyDialogueChoice(before, 'mara', 'mechanic-power', 0);
  expect(getDialogueOptions('mara', 'power cell', after).map(option => option.id)).toContain('mechanic-power-repeat');
});

it('offers a different Jev activity after a resident has repeated the same one three times', async () => {
  const { getValidActivities } = await import('../src/city/decisions');
  const state = createCityState();
  state.residents.mara.activity = 'work';
  (state.residents.mara as typeof state.residents.mara & { activityStreak: number }).activityStreak = 3;
  expect(getValidActivities('mara', state).map(option => option.id)).not.toContain('work');
  expect(getValidActivities('mara', state).length).toBeGreaterThan(1);
});

it('every suggested city-rumor topic gives the courier a relevant authored answer', () => {
  const options = getDialogueOptions('eli', 'Tell me about city rumors.', createCityState());
  expect(options.map(option => option.id)).toContain('courier-city');
});
