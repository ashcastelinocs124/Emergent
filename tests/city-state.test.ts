import { describe, expect, it } from 'vitest';
import { createCityState, recordClaim, setAssumption, collectMaterial, installMaterial, isLaunchReady } from '../src/city/state';

describe('city evidence and repairs', () => {
  it('keeps attributed contradictory claims and rejects invented evidence', () => {
    let state = createCityState();
    state = recordClaim(state, 'mechanic-power');
    state = recordClaim(state, 'courier-power');
    expect(state.claims.map(claim => claim.speakerId)).toEqual(['mara', 'eli']);
    expect(state.claims).toHaveLength(2);
    expect(() => setAssumption(state, 'power-cell', 'workshop', ['fake'])).toThrow();
    expect(setAssumption(state, 'power-cell', 'workshop', ['mechanic-power']).assumptions['power-cell']?.evidenceIds).toEqual(['mechanic-power']);
  });
  it('requires proximity and physical access to collect materials', () => {
    const state = createCityState();
    expect(collectMaterial(state, 'power-cell')).toBe(state);
    const atWorkshop = { ...state, player: { x: -26, z: -8 }, access: { ...state.access, workshop: true } };
    expect(collectMaterial(atWorkshop, 'power-cell').inventory).toContain('power-cell');
  });
  it('launches only after all three carried materials are installed at the ship', () => {
    let state = createCityState();
    expect(isLaunchReady(state)).toBe(false);
    state = { ...state, player: { x: 0, z: -29 }, inventory: ['power-cell', 'thermal-shield', 'navigation-relay'] };
    for (const id of ['power-cell', 'thermal-shield', 'navigation-relay'] as const) state = installMaterial(state, id);
    expect(isLaunchReady(state)).toBe(true);
  });
});

describe('physical evidence', () => {
  it('talking does not open the workshop cabinet and inspecting a site records a sourced observation once', async () => {
    const { recordObservation } = await import('../src/city/state');
    const heard = recordClaim(createCityState(), 'mechanic-power');
    expect(heard.access.workshop).toBe(false);
    const observed = recordObservation(heard, 'workshop-lever', 'The yellow lever released the workshop cabinet.', 'workshop');
    expect(observed.observations).toEqual([{ id: 'workshop-lever', text: 'The yellow lever released the workshop cabinet.', locationId: 'workshop', at: 0 }]);
    expect(recordObservation(observed, 'workshop-lever', 'duplicate', 'workshop')).toBe(observed);
  });
});

describe('civic conversation notes', () => {
  it('keeps a resident statement about the city with source and time even when it is not a repair clue', () => {
    const state = recordClaim(createCityState(), 'salvager-city');
    expect(state.statements).toEqual([{ id: 'salvager-city', speakerId: 'sora', text: expect.stringContaining('crash'), at: 0 }]);
    expect(state.claims).toEqual([]);
  });
});

describe('evidence changes over time', () => {
  it('marks an earlier supported assumption disputed when a later contradictory claim arrives', () => {
    let state = recordClaim(createCityState(), 'mechanic-power');
    state = setAssumption(state, 'power-cell', 'workshop', ['mechanic-power']);
    expect(state.assumptions['power-cell']?.status).toBe('supported');
    state = recordClaim(state, 'courier-power');
    expect(state.assumptions['power-cell']?.status).toBe('disputed');
  });
});
