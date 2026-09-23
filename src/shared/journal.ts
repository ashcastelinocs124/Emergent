import type { Action, ItemKind, SpeciesId, Vec3 } from './model';

export interface Observation {
  id: string;
  at: number;
  creatureId: string;
  speciesId: SpeciesId;
  action: Action | 'EGG_PICKUP' | 'WARNING';
  position: Vec3;
  carriedItem: ItemKind | null;
  note: string;
  previousEncounterId?: string;
}
export interface Visibility { lineOfSight: boolean; distance: number; orientation: number }
export interface Hypothesis {
  id: string;
  condition: string;
  response: string;
  evidence: { observationId: string; relation: 'supports' | 'conflicts' }[];
}
export interface Journal { observations: Observation[]; hypotheses: Hypothesis[] }

export function emptyJournal(): Journal { return { observations: [], hypotheses: [] }; }

export function recordObservation(journal: Journal, event: Observation, visibility: Visibility): Journal {
  if (!visibility.lineOfSight || visibility.distance > 35 || visibility.orientation < .5 ||
    journal.observations.some(observation => observation.id === event.id)) return journal;
  const earlier = [...journal.observations].reverse().find(observation => observation.creatureId === event.creatureId);
  return { ...journal, observations: [...journal.observations, {
    ...event, position: { ...event.position }, previousEncounterId: earlier?.id,
  }].slice(-200) };
}

export function addHypothesis(journal: Journal, condition: string, response: string): Journal {
  if (!condition.trim() || !response.trim()) return journal;
  return { ...journal, hypotheses: [...journal.hypotheses, {
    id: `hypothesis-${journal.hypotheses.length + 1}`, condition: condition.trim(), response: response.trim(), evidence: [],
  }] };
}

export function assessEvidence(journal: Journal, observationId: string, hypothesisId: string,
  relation: 'supports' | 'conflicts'): Journal {
  if (!journal.observations.some(observation => observation.id === observationId)) return journal;
  if (!journal.hypotheses.some(hypothesis => hypothesis.id === hypothesisId)) return journal;
  return { ...journal, hypotheses: journal.hypotheses.map(hypothesis => hypothesis.id !== hypothesisId ? hypothesis : {
    ...hypothesis,
    evidence: [...hypothesis.evidence.filter(entry => entry.observationId !== observationId), { observationId, relation }],
  }) };
}
