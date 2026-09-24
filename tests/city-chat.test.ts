import { describe, expect, it } from 'vitest';
import { buildCityChatPrompt, chooseGroundedReply, validateCityChatInput, type CityChatInput } from '../server/city-chat';
import { createCityState } from '../src/city/state';
import { recordDialogueExchange } from '../src/city/conversation';
import { getDialogueOptions } from '../src/city/decisions';

const input: CityChatInput = { residentId: 'mara', utterance: 'Where is the power cell?', anchorId: 'mechanic-power', history: [] };

describe('resident chat', () => {
  it('accepts a grounded question and rejects an invented fact or oversized history', () => {
    expect(validateCityChatInput(input)).toBe(true);
    expect(validateCityChatInput({ ...input, anchorId: 'courier-power' })).toBe(false);
    expect(validateCityChatInput({ ...input, history: Array(20).fill({ speaker: 'player', text: 'hello' }) })).toBe(false);
    expect(validateCityChatInput({ ...input, utterance: 'x'.repeat(241) })).toBe(false);
    expect(validateCityChatInput({ ...input, history: [{ speaker: 'resident', text: 'x'.repeat(850) }] })).toBe(true);
    expect(validateCityChatInput({ ...input, history: [{ speaker: 'resident', text: 'x'.repeat(901) }] })).toBe(false);
  });

  it('puts the authored claim in higher-priority instructions and preserves turns', () => {
    const prompt = buildCityChatPrompt({ ...input, history: [{ speaker: 'player', text: 'Hello' }, { speaker: 'resident', text: 'Evening.' }] });
    expect(prompt.instructions).toContain('workshop cabinet');
    expect(prompt.instructions).toContain('Mara Voss');
    expect(prompt.input).toEqual([{ role: 'user', content: 'Hello' }, { role: 'assistant', content: 'Evening.' }, { role: 'user', content: 'Where is the power cell?' }]);
  });

  it('remembers the exact exchange while the journal keeps the selected authored claim', () => {
    const state = recordDialogueExchange(createCityState(), 'mara', 'Where is it?', 'In my workshop, by the lever.', 'mechanic-power');
    expect(state.conversations.mara.map(turn => turn.text)).toEqual(['Where is it?', 'In my workshop, by the lever.']);
    expect(state.statements[0].text).toContain('charged power cell');
  });

  it('offers the previous sourced topic for a referential follow-up', () => {
    const state = recordDialogueExchange(createCityState(), 'mara', 'Where is the power cell?', 'It is in the workshop.', 'mechanic-power');
    expect(getDialogueOptions('mara', 'Where exactly is it?', state).map(option => option.id)).toContain('mechanic-power');
    expect(getDialogueOptions('mara', 'How are you doing?', state).map(option => option.id)).not.toContain('mechanic-power');
  });

  it('keeps the selected account verbatim and rejects invented facts or changed certainty', () => {
    expect(chooseGroundedReply(input, 'Good question.').reply).toContain('yellow lever');
    expect(chooseGroundedReply(input, 'Good question.').mode).toBe('openai');
    expect(chooseGroundedReply(input, 'The cell is at the depot.').mode).toBe('authored');
    expect(chooseGroundedReply(input, 'The power cell is in my workshop cabinet.').mode).toBe('authored');
    const rumor: CityChatInput = { ...input, residentId: 'eli', anchorId: 'courier-power' };
    expect(chooseGroundedReply(rumor, 'I personally saw the power cell at the transit depot today. It is definitely there.').reply)
      .toBe('I heard the power cells were moved to the transit depot last week. I did not see the shipment myself.');
    const switchLead: CityChatInput = { ...input, residentId: 'dev', anchorId: 'engineer-relay' };
    expect(chooseGroundedReply(switchLead, 'Press the red switch behind the crane to unlock it.').mode).toBe('authored');
  });

  it('allows casual conversation while filtering invented repair leads', () => {
    const casual: CityChatInput = { ...input, anchorId: 'clarify', utterance: 'How has your day been?' };
    expect(chooseGroundedReply(casual, 'Long shift. Glad someone stopped to talk.').mode).toBe('openai');
    expect(chooseGroundedReply(casual, 'Long shift at the workshop. Glad someone stopped to talk.').mode).toBe('openai');
    expect(chooseGroundedReply(casual, 'The relay is under the red switch at the depot.').mode).toBe('authored');
  });
});
