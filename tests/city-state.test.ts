import { describe, expect, it } from 'vitest';
import { createCityState, enterShip, exitShip, toggleShipCloak, recordClaim, setAssumption, collectMaterial, installMaterial, isLaunchReady } from '../src/city/state';
import { crashSite } from '../src/city/geography';

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
    let state = exitShip(createCityState());
    expect(isLaunchReady(state)).toBe(false);
    state = { ...state, player: { ...crashSite.console }, inventory: ['power-cell', 'thermal-shield', 'navigation-relay'] };
    for (const id of ['power-cell', 'thermal-shield', 'navigation-relay'] as const) state = installMaterial(state, id);
    expect(isLaunchReady(state)).toBe(true);
  });
  it('starts aboard, exits at the ramp, and conceals or reveals the ship only nearby', () => {
    const aboard = createCityState();
    expect(aboard.shipStage).toBe('aboard');
    expect(toggleShipCloak(aboard)).toBe(aboard);
    const outside = exitShip(aboard);
    expect(outside.shipStage).toBe('outside');
    expect(outside.player).toEqual(crashSite.exit);
    expect(outside.player.z).toBeLessThan(-100);
    const hidden = toggleShipCloak(outside);
    expect(hidden.shipStage).toBe('hidden');
    expect(toggleShipCloak({ ...hidden, player: { x: 90, z: 90 } })).toEqual({ ...hidden, player: { x: 90, z: 90 } });
    expect(toggleShipCloak(hidden).shipStage).toBe('outside');
  });
  it('re-enters only at the revealed hatch and can leave again without losing progress', () => {
    const outside = exitShip(recordClaim(createCityState(), 'mechanic-power'));
    expect(outside.hasExitedShip).toBe(true);
    expect(enterShip(outside)).toBe(outside);
    const atHatch = { ...outside, player: { ...crashSite.hatch }, inventory: ['power-cell' as const] };
    expect(enterShip({ ...atHatch, shipStage: 'hidden' })).toEqual({ ...atHatch, shipStage: 'hidden' });
    expect(enterShip({ ...atHatch, launched: true })).toEqual({ ...atHatch, launched: true });
    const aboard = enterShip(atHatch);
    expect(aboard.shipStage).toBe('aboard');
    expect(aboard.player).toEqual(crashSite.aboard);
    expect(aboard.inventory).toEqual(['power-cell']);
    expect(aboard.claims).toEqual(outside.claims);
    expect(exitShip(aboard)).toMatchObject({ shipStage: 'outside', player: crashSite.exit, hasExitedShip: true, inventory: ['power-cell'] });
  });
  it('requires the wreck to be revealed before installing a part', () => {
    const outside = exitShip(createCityState());
    const atConsole = { ...outside, player: { ...crashSite.console }, inventory: ['power-cell' as const] };
    expect(installMaterial({ ...atConsole, shipStage: 'hidden' }, 'power-cell').installed).toEqual([]);
    expect(installMaterial(atConsole, 'power-cell').installed).toEqual(['power-cell']);
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
