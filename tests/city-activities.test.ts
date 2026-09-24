import { expect, it } from 'vitest';
import { createCityState } from '../src/city/state';
import { applyDialogueChoice } from '../src/city/conversation';
import { applyResidentActivity } from '../src/city/activities';
it('discards a resident activity chosen before that resident learned something new', () => {
  const state = createCityState();
  const afterTalk = applyDialogueChoice(state, 'mara', 'mechanic-power', 0);
  expect(applyResidentActivity(afterTalk, 'mara', 'walk', 0, 18)).toBe(afterTalk);
  const applied = applyResidentActivity(state, 'mara', 'walk', 0, 18);
  expect(applied.residents.mara.activity).toBe('walk');
  expect(applied.residents.mara.nextDecisionAt).toBe(18);
});
