import { describe, expect, test } from 'vitest';
import { addHypothesis, assessEvidence, emptyJournal, recordObservation } from '../src/shared/journal';
import { at } from './fixtures';

const observation = { id: 'seen-1', at: 12, creatureId: 'guardian-3', speciesId: 'guardian' as const,
  action: 'DEFEND' as const, position: at(4, 8), carriedItem: 'egg' as const, note: 'Guardian advanced when I carried an egg.' };
const visible = { lineOfSight: true, distance: 12, orientation: .9 };

describe('field journal evidence', () => {
  test('records visible guardian response with carried egg and creature identity', () => {
    const journal = recordObservation(emptyJournal(), observation, visible);
    expect(journal.observations).toContainEqual(expect.objectContaining({ creatureId: 'guardian-3', action: 'DEFEND', carriedItem: 'egg' }));
  });

  test('does not record obscured or distant hidden behavior', () => {
    expect(recordObservation(emptyJournal(), observation, { ...visible, lineOfSight: false }).observations).toHaveLength(0);
    expect(recordObservation(emptyJournal(), observation, { ...visible, distance: 80 }).observations).toHaveLength(0);
    expect(recordObservation(emptyJournal(), observation, { ...visible, orientation: -.2 }).observations).toHaveLength(0);
  });

  test('links later sightings of the same individual without declaring a rule true', () => {
    const first = recordObservation(emptyJournal(), { ...observation, id: 'theft', action: 'FOLLOW', note: 'This guardian watched the egg pickup.' }, visible);
    const later = recordObservation(first, { ...observation, id: 'later', at: 90, carriedItem: null, action: 'FOLLOW' }, visible);
    expect(later.observations[1].previousEncounterId).toBe('theft');
    const withHypothesis = addHypothesis(later, 'Carrying guardian eggs', 'Guardian defends its nest');
    const assessed = assessEvidence(withHypothesis, 'later', withHypothesis.hypotheses[0].id, 'conflicts');
    expect(assessed.hypotheses[0].evidence).toContainEqual({ observationId: 'later', relation: 'conflicts' });
    expect(assessed.hypotheses[0]).not.toHaveProperty('verified');
  });
});
