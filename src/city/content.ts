import type { LocationId, MaterialId, ResidentId } from './model';
export const materials: Record<MaterialId, { name: string; location: LocationId; x: number; z: number; diagnostic: string }> = {
  'power-cell': { name: 'Power cell', location: 'workshop', x: -26, z: -8, diagnostic: 'A compact power cell can restart the engine bus.' },
  'thermal-shield': { name: 'Thermal shield', location: 'salvage-yard', x: 27, z: -18, diagnostic: 'Heat shielding is missing from the ascent drive.' },
  'navigation-relay': { name: 'Navigation relay', location: 'transit-depot', x: 22, z: 28, diagnostic: 'The guidance relay was destroyed on impact.' },
};
export const residents: Record<ResidentId, { name: string; role: string; x: number; z: number; color: number; topics: string[] }> = {
  mara: { name: 'Mara Voss', role: 'Mechanic', x: -20, z: -9, color: 0xd79761, topics: ['the power cell', 'the workshop', 'your ship'] },
  eli: { name: 'Eli Mercer', role: 'Courier', x: 3, z: 9, color: 0x718da4, topics: ['the power cell', 'the old depot', 'city rumors'] },
  sora: { name: 'Sora Vale', role: 'Salvager', x: 23, z: -12, color: 0xa7684f, topics: ['thermal shielding', 'the salvage yard', 'city rumors'] },
  dev: { name: 'Dev Rao', role: 'Transit engineer', x: 21, z: 22, color: 0x729a8b, topics: ['navigation relay', 'the transit depot', 'your ship'] },
};
export const responses: Record<string, { speakerId: ResidentId; text: string; keywords: string[]; after?: string; materialId?: MaterialId; locationId?: LocationId; grantsAccess?: LocationId }> = {
  'mechanic-power': { speakerId: 'mara', text: 'A charged power cell is in my workshop cabinet. The door sticks; pull the yellow lever beside it. Take the cell if it gets your ship flying.', keywords: ['power', 'cell', 'battery', 'workshop'], materialId: 'power-cell', locationId: 'workshop', },
  'mechanic-power-repeat': { speakerId: 'mara', text: 'You asked about the cell before. Did you try the yellow lever beside my cabinet? It sticks unless you pull it hard.', keywords: ['power', 'cell', 'workshop', 'lever'], after: 'mechanic-power' },
  'mechanic-shield': { speakerId: 'mara', text: 'Sora salvages heat plating across the east street. Ask her whether she has anything thin enough for a ship.', keywords: ['thermal', 'shield', 'heat'], materialId: 'thermal-shield', locationId: 'salvage-yard' },
  'mechanic-ship': { speakerId: 'mara', text: 'Your drive sounds starved. Find a power cell, shielding, and a navigation relay. Bring each back to the ship console.', keywords: ['ship', 'repair', 'engine', 'escape'] },
  'courier-power': { speakerId: 'eli', text: 'I heard the power cells were moved to the transit depot last week. I did not see the shipment myself.', keywords: ['power', 'cell', 'battery'], materialId: 'power-cell', locationId: 'transit-depot' },
  'courier-city': { speakerId: 'eli', text: 'New Eden grew around the transit line. When your ship came down, crews blocked the main arterial, but the old side streets still connect the district.', keywords: ['city', 'rumor', 'rumors', 'people', 'streets'] },
  'courier-power-doubt': { speakerId: 'eli', text: 'Mara says she still has one? Then my depot shipment story may be old. I only heard it from a driver.', keywords: ['mara', 'workshop', 'old', 'shipment'], after: 'courier-power' },
  'courier-depot': { speakerId: 'eli', text: 'Dev still runs the depot after dark. The relay store is across the east crossing, under the blue transit sign.', keywords: ['depot', 'relay', 'navigation', 'transit'], materialId: 'navigation-relay', locationId: 'transit-depot' },
  'salvager-shield': { speakerId: 'sora', text: 'I pulled a thermal shield from a wreck yesterday. It is in the salvage yard, by the crane. The gate is open to anyone who needs scrap.', keywords: ['thermal', 'shield', 'heat', 'salvage'], materialId: 'thermal-shield', locationId: 'salvage-yard' },
  'salvager-city': { speakerId: 'sora', text: 'People saw your crash beyond the southern approach, then the district went back to work. They notice your helmet, though.', keywords: ['city', 'people', 'rumor', 'crash'] },
  'engineer-relay': { speakerId: 'dev', text: 'There is a working navigation relay in the transit depot service bay. The green switch releases the maintenance cage.', keywords: ['relay', 'navigation', 'depot', 'transit'], materialId: 'navigation-relay', locationId: 'transit-depot', },
  'engineer-ship': { speakerId: 'dev', text: 'I can read your ship beacon. It can leave this planet once the power, heat barrier, and guidance are back online.', keywords: ['ship', 'repair', 'escape', 'beacon'] },
};
export const clarifications: Record<ResidentId, string> = {
  mara: 'I can tell you about your ship or what is in the workshop. What do you need?',
  eli: 'I know the roads and the depot. Ask me about those.',
  sora: 'I know the salvage yard and what I found there. Be specific.',
  dev: 'I can help with navigation hardware or the depot. Which one?',
};
export const materialIds = Object.keys(materials) as MaterialId[];
export const residentIds = Object.keys(residents) as ResidentId[];
