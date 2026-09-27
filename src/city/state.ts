import { materialIds, materials, residentIds, residents, responses } from './content';
import type { CityState, Claim, LocationId, MaterialId } from './model';
import { crashSite } from './geography';
const distance = (a: { x: number; z: number }, b: { x: number; z: number }) => Math.hypot(a.x - b.x, a.z - b.z);
function assess(claims: Claim[], materialId: MaterialId, locationId: LocationId, evidenceIds: string[]): 'possible' | 'supported' | 'disputed' {
  const supporting = claims.some(claim => evidenceIds.includes(claim.id) && claim.materialId === materialId && claim.locationId === locationId);
  const conflicting = claims.some(claim => claim.materialId === materialId && claim.locationId !== locationId);
  return supporting ? (conflicting ? 'disputed' : 'supported') : 'possible';
}
export function createCityState(): CityState {
  return { version: 1, time: 0, player: { ...crashSite.aboard }, shipStage: 'aboard', hasExitedShip: false, claims: [], statements: [], observations: [], conversations: { mara: [], eli: [], sora: [], dev: [] }, assumptions: {}, inventory: [], installed: [],
    access: { workshop: false, 'salvage-yard': true, 'transit-depot': false }, lead: null, launched: false,
    residents: Object.fromEntries(residentIds.map(id => [id, { activity: 'work', activityStreak: 0, epoch: 0, nextDecisionAt: 1, heard: [], position: { x: residents[id].x, z: residents[id].z } }])) as unknown as CityState['residents'] };
}
export function exitShip(state: CityState): CityState {
  return state.shipStage === 'aboard' ? { ...state, shipStage: 'outside', hasExitedShip: true, player: { ...crashSite.exit } } : state;
}
export function enterShip(state: CityState): CityState {
  if (state.shipStage !== 'outside' || state.launched || distance(state.player, crashSite.hatch) > 5.2) return state;
  return { ...state, shipStage: 'aboard', player: { ...crashSite.aboard } };
}
export function toggleShipCloak(state: CityState): CityState {
  if (state.shipStage === 'aboard' || state.launched || distance(state.player, crashSite.cloak) > 5.2) return state;
  return { ...state, shipStage: state.shipStage === 'hidden' ? 'outside' : 'hidden' };
}
export function recordClaim(state: CityState, responseId: string): CityState {
  const response = responses[responseId];
  if (!response || state.statements.some(statement => statement.id === responseId)) return state;
  const claims: Claim[] = response.materialId && response.locationId ? [...state.claims, { id: responseId, speakerId: response.speakerId, text: response.text, materialId: response.materialId, locationId: response.locationId, at: state.time }] : state.claims;
  const assumptions = { ...state.assumptions };
  for (const id of materialIds) {
    const assumption = assumptions[id];
    if (assumption) assumptions[id] = { ...assumption, status: assess(claims, id, assumption.locationId, assumption.evidenceIds) };
  }
  return { ...state, claims, assumptions, statements: [...state.statements, { id: responseId, speakerId: response.speakerId, text: response.text, at: state.time }],
    residents: { ...state.residents, [response.speakerId]: { ...state.residents[response.speakerId], heard: [...state.residents[response.speakerId].heard, responseId] } } };
}
export function recordObservation(state: CityState, id: string, text: string, locationId: LocationId): CityState {
  if (state.observations.some(observation => observation.id === id)) return state;
  return { ...state, observations: [...state.observations, { id, text, locationId, at: state.time }] };
}
export function setAssumption(state: CityState, materialId: MaterialId, locationId: LocationId, evidenceIds: string[]): CityState {
  if (!materialIds.includes(materialId) || !(['workshop', 'salvage-yard', 'transit-depot'] as LocationId[]).includes(locationId) || evidenceIds.some(id => !state.statements.some(statement => statement.id === id) && !state.observations.some(observation => observation.id === id))) throw new Error('Invalid assumption evidence');
  const status = assess(state.claims, materialId, locationId, evidenceIds);
  return { ...state, assumptions: { ...state.assumptions, [materialId]: { materialId, locationId, evidenceIds: [...new Set(evidenceIds)], status } } };
}
export function canCollectMaterial(state: CityState, id: MaterialId): boolean {
  const material = materials[id];
  return !!material && state.access[material.location] && !state.inventory.includes(id) && !state.installed.includes(id) && distance(state.player, material) <= 3.4;
}
export function collectMaterial(state: CityState, id: MaterialId): CityState {
  return canCollectMaterial(state, id) ? { ...state, inventory: [...state.inventory, id] } : state;
}
export function installMaterial(state: CityState, id: MaterialId): CityState {
  if (state.shipStage !== 'outside' || !state.inventory.includes(id) || distance(state.player, crashSite.console) > 7) return state;
  return { ...state, inventory: state.inventory.filter(candidate => candidate !== id), installed: [...state.installed, id] };
}
export function isLaunchReady(state: CityState): boolean { return materialIds.every(id => state.installed.includes(id)); }
