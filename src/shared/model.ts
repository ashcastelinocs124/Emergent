export type SpeciesId = 'guardian' | 'grazer' | 'stalker';
export type Action = 'HUNT' | 'FLEE' | 'HIDE' | 'EAT' | 'FOLLOW' | 'DEFEND' | 'MATE' | 'EXPLORE';
export type Vec3 = { x: number; y: number; z: number };
export type Intent = { action: Action; targetId?: string };

export type ItemKind = 'egg' | 'spore' | 'corpse' | 'component';
export interface ItemState {
  id: string;
  kind: ItemKind;
  position: Vec3;
  available: boolean;
  ownerSpecies?: SpeciesId;
}

export type MemoryEventType = 'fed' | 'threatened' | 'injured' | 'egg_stolen';
export interface MemoryFact {
  id: string;
  type: MemoryEventType;
  otherId: string;
  at: number;
}
export interface CreatureMemory {
  events: MemoryFact[];
  disposition: number;
}
export interface CreatureState {
  id: string;
  speciesId: SpeciesId;
  position: Vec3;
  facing: Vec3;
  alive: boolean;
  health: number;
  hunger: number;
  fear: number;
  mateDrive: number;
  memory: CreatureMemory;
  currentIntent: Intent | null;
  actionEndsAt: number;
  nextDecisionAt: number;
  decisionEpoch: number;
}
export interface PlayerState {
  id: 'player';
  position: Vec3;
  inventory: ItemState[];
  air: number;
  power: number;
  food: number;
  health: number;
  hidden: boolean;
  scannerOn: boolean;
}
export interface NestState {
  id: string;
  speciesId: SpeciesId;
  position: Vec3;
  radius: number;
}
export interface WorldState {
  time: number;
  player: PlayerState;
  creatures: CreatureState[];
  items: ItemState[];
  nests: NestState[];
  shipPosition: Vec3;
  componentExposed: boolean;
  componentInstalled: boolean;
}

export interface CreatureEvent {
  id: string;
  type: MemoryEventType | 'warning' | 'attacked' | 'ate' | 'died' | 'mated';
  creatureId: string;
  otherId?: string;
  at: number;
  position?: Vec3;
}

export interface DecisionInput {
  creatureId: string;
  epoch: number;
  world: WorldState;
  intents: Intent[];
}
export interface DecisionResult {
  creatureId: string;
  epoch: number;
  intent: Intent;
  elapsedMs?: number;
  usage?: { inputTokens: number; outputTokens: number };
}
