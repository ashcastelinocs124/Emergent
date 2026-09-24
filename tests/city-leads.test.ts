import { expect, it } from 'vitest';
import { createCityState, recordClaim } from '../src/city/state';
import { getAvailableLeads } from '../src/city/decisions';
import { applyLeadChoice } from '../src/city/leads';
it('offers only heard leads and rejects unoffered suggestions', () => {
  let state = createCityState();
  expect(getAvailableLeads(state).map(option => option.id)).toEqual(['seek-more-evidence']);
  state = recordClaim(state, 'mechanic-power');
  expect(applyLeadChoice(state, 'navigation-relay@transit-depot')).toBe(state);
  expect(applyLeadChoice(state, 'power-cell@workshop').lead).toBe('power-cell@workshop');
});
