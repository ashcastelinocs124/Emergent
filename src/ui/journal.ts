import { addHypothesis, assessEvidence, type Journal } from '../shared/journal';
import type { SpeciesId } from '../shared/model';

export interface JournalUI { toggle(): void; close(): void; isOpen(): boolean; render(): void }

const escape = (value: string): string => value.replace(/[&<>"']/g, character =>
  ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export function createJournalUI(root: HTMLElement, getJournal: () => Journal,
  setJournal: (journal: Journal) => void, onToggle: (open: boolean) => void): JournalUI {
  let species: SpeciesId | 'all' = 'all';
  const form = root.querySelector<HTMLFormElement>('#journal-form')!;
  const close = () => { root.hidden = true; onToggle(false); };
  const render = () => {
    const journal = getJournal();
    const observations = journal.observations.filter(observation => species === 'all' || observation.speciesId === species);
    root.querySelector<HTMLElement>('#journal-count')!.textContent = `${String(observations.length).padStart(2, '0')} RECORDS`;
    root.querySelector<HTMLElement>('#journal-observations')!.innerHTML = observations.length ? [...observations].reverse().map(observation => `
      <article class="journal-card"><div class="journal-meta">${escape(observation.speciesId.toUpperCase())} / ${escape(observation.creatureId)} · T+${Math.round(observation.at)}s</div>
      <strong>${escape(observation.action.replace('_', ' '))}</strong><p>${escape(observation.note)}</p>
      <div class="journal-meta">CARRIED: ${escape(observation.carriedItem?.toUpperCase() ?? 'NOTHING')} · ${Math.round(observation.position.x)}, ${Math.round(observation.position.z)}
      ${observation.previousEncounterId ? ` · PRIOR ENCOUNTER ${escape(observation.previousEncounterId)}` : ''}</div></article>`).join('')
      : '<p class="journal-empty">No sightings recorded yet. Watch creatures through your visor.</p>';
    root.querySelector<HTMLElement>('#journal-theories')!.innerHTML = journal.hypotheses.length ? journal.hypotheses.map(hypothesis => `
      <article class="journal-card"><div class="journal-meta">THEORY ${escape(hypothesis.id)}</div><strong>${escape(hypothesis.condition)}</strong><p>EXPECT: ${escape(hypothesis.response)}</p>
      <div class="journal-meta">${hypothesis.evidence.length} MARKED OBSERVATIONS</div>
      ${journal.observations.length ? `<div class="journal-evidence"><select aria-label="Sighting for ${escape(hypothesis.id)}" data-hypothesis="${escape(hypothesis.id)}">${[...journal.observations].reverse().slice(0, 20).map(observation => `<option value="${escape(observation.id)}">${escape(observation.creatureId)} · ${escape(observation.action)}</option>`).join('')}</select>
      <button type="button" data-assess="supports" data-hypothesis="${escape(hypothesis.id)}">Supports</button><button type="button" data-assess="conflicts" data-hypothesis="${escape(hypothesis.id)}">Conflicts</button></div>` : ''}</article>`).join('')
      : '<p class="journal-empty">Write a theory. Mark sightings as support or conflict yourself.</p>';
    root.querySelectorAll<HTMLButtonElement>('.journal-tab').forEach(tab => tab.classList.toggle('active', tab.dataset.species === species));
  };
  root.querySelector<HTMLButtonElement>('#journal-close')!.addEventListener('click', close);
  root.querySelectorAll<HTMLButtonElement>('.journal-tab').forEach(tab => tab.addEventListener('click', () => {
    species = tab.dataset.species as SpeciesId | 'all'; render();
  }));
  form.addEventListener('submit', event => {
    event.preventDefault();
    const condition = root.querySelector<HTMLInputElement>('#hypothesis-condition')!;
    const response = root.querySelector<HTMLInputElement>('#hypothesis-response')!;
    const updated = addHypothesis(getJournal(), condition.value, response.value);
    setJournal(updated);
    condition.value = response.value = '';
    render();
  });
  root.addEventListener('click', event => {
    const button = (event.target as HTMLElement).closest<HTMLButtonElement>('[data-assess]');
    if (!button) return;
    const hypothesisId = button.dataset.hypothesis!;
    const observationId = root.querySelector<HTMLSelectElement>(`select[data-hypothesis="${hypothesisId}"]`)?.value;
    if (!observationId) return;
    setJournal(assessEvidence(getJournal(), observationId, hypothesisId, button.dataset.assess as 'supports' | 'conflicts'));
    render();
  });
  return {
    toggle() { root.hidden = !root.hidden; if (!root.hidden) render(); onToggle(!root.hidden); },
    close,
    isOpen: () => !root.hidden,
    render,
  };
}
