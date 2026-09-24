import { describe, expect, it } from 'vitest';
import { getCasualReply, getResidentOpener } from '../src/city/personas';

describe('resident personality', () => {
  it('answers an ordinary question from each person’s own workday', () => {
    expect(getCasualReply('mara', 'How was your day?', 0)).toContain('motor');
    expect(getCasualReply('eli', 'How are you doing?', 0)).toContain('deliveries');
    expect(getCasualReply('sora', 'How has your day been?', 0)).toContain('yard');
    expect(getCasualReply('dev', 'How was your day?', 0)).toContain('signals');
  });

  it('acknowledges a return visit without inventing a repair clue', () => {
    expect(getResidentOpener('mara', 'work', true)).toContain('back');
    expect(getCasualReply('mara', 'How are you?', 2)).toContain('Still');
  });

  it('keeps unfamiliar topics on the authored clarification path', () => {
    expect(getCasualReply('mara', 'What is purple?', 0)).toContain('What do you need?');
  });
});
