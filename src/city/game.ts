import * as THREE from 'three';
import { createControls } from '../game/controls';
import { createCityHabitat } from './habitat';
import { createResidentViews, createMaterialViews } from './residents';
import { startCityAudio, uiBeep } from './audio';
import { materials, materialIds, residents, residentIds, responses, clarifications } from './content';
import { createCityState, collectMaterial, installMaterial, isLaunchReady, setAssumption, recordObservation } from './state';
import { getDialogueOptions, getValidActivities, getAvailableLeads } from './decisions';
import { recordDialogueExchange } from './conversation';
import { applyResidentActivity } from './activities';
import { applyLeadChoice } from './leads';
import { loadCitySave, writeCitySave, CITY_SAVE_KEY } from './save';
import type { CityChoiceInput, CityChoiceResult, CityState, MaterialId, ResidentId, LocationId } from './model';

type Target = { type: 'resident' | 'material' | 'switch' | 'ship'; id: string; label: string; x: number; z: number };
const el = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const locName: Record<LocationId, string> = { workshop: 'Voss Workshop', 'salvage-yard': 'Salvage Yard', 'transit-depot': 'Transit Depot' };
const materialName = (id: MaterialId) => materials[id].name;
const systemName: Record<MaterialId, string> = { 'power-cell': 'Power bus', 'thermal-shield': 'Thermal barrier', 'navigation-relay': 'Guidance' };
export function startCityGame(): void {
  const mount = el<HTMLDivElement>('game');
  const entry = el<HTMLDivElement>('entry');
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2)); renderer.setSize(innerWidth, innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMapping = THREE.ACESFilmicToneMapping; renderer.toneMappingExposure = 1.2;
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap; mount.appendChild(renderer.domElement);
  const scene = new THREE.Scene(); const habitat = createCityHabitat(scene);
  const camera = new THREE.PerspectiveCamera(76, innerWidth / innerHeight, .1, 380);
  const controls = createControls(camera, renderer.domElement, habitat.heightAt);
  let state: CityState = loadCitySave(localStorage) ?? createCityState();
  controls.teleport(state.player.x, state.player.z, new THREE.Vector3(0, 1.8, -2));
  const residentViews = createResidentViews(scene); const materialViews = createMaterialViews(scene);
  let entered = false, conversationId: ResidentId | null = null, conversationTicket = 0, leadTicket = 0;
  let target: Target | null = null, lastSave = 0, lastHud = 0, lastActivityTick = 0, toastUntil = 0;
  let linkOkay = true, chatMode: 'ready' | 'simulated' | 'unavailable' = 'unavailable'; const pendingActivities = new Set<ResidentId>();
  const debug = new URLSearchParams(location.search).has('debug');
  const toast = (message: string) => { el('toast').textContent = message; el('toast').classList.add('visible'); toastUntil = performance.now() + 3500; uiBeep(); };
  const save = () => writeCitySave(localStorage, state);
  const setLink = (okay: boolean) => { linkOkay = okay; el('link-status').textContent = okay ? 'JEV LINK · ACTIVE' : 'JEV LINK · LOST'; el('link-warning').hidden = okay; };
  async function choose(input: CityChoiceInput): Promise<CityChoiceResult> {
    const controller = new AbortController(); const deadline = setTimeout(() => controller.abort(), 7000);
    try {
      const response = await fetch('/api/city-choice', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input), signal: controller.signal });
      if (!response.ok) throw new Error(`Decision service ${response.status}`);
      const result = await response.json() as CityChoiceResult;
      if (result.actorId !== input.actorId || result.epoch !== input.epoch || !input.options.some(option => option.id === result.choiceId)) throw new Error('Invalid decision reply');
      setLink(true); return result;
    } catch (error) { setLink(false); throw error; }
    finally { clearTimeout(deadline); }
  }
  const setChatMode = (mode: typeof chatMode) => { chatMode = mode; el('chat-mode').textContent = mode === 'ready' ? 'OPENAI CONVERSATION · LIVE' : mode === 'simulated' ? 'CONVERSATION · TEST SIMULATION' : 'OPENAI CHAT UNAVAILABLE · RECORDED ACCOUNTS'; };
  void fetch('/api/health').then(response => response.json()).then((health: { mode?: string; status?: string; chat?: typeof chatMode }) => {
    el('mode-badge').hidden = health.mode !== 'fake'; setLink(health.status === 'ready'); setChatMode(health.chat ?? 'unavailable');
  }).catch(() => setLink(false));
  el<HTMLButtonElement>('link-retry').addEventListener('click', async () => {
    try { const response = await fetch('/api/health'); const health = await response.json() as { status: string; chat?: typeof chatMode }; setLink(response.ok && health.status === 'ready'); setChatMode(health.chat ?? 'unavailable'); if (linkOkay) toast('Decision link restored'); } catch { setLink(false); }
  });
  const distance = (x: number, z: number) => Math.hypot(camera.position.x - x, camera.position.z - z);
  const candidates = (): Target[] => [
    ...residentIds.map(id => ({ type: 'resident' as const, id, label: `TALK TO ${residents[id].name.toUpperCase()}`, x: state.residents[id].position.x, z: state.residents[id].position.z })),
    ...materialIds.filter(id => !state.inventory.includes(id) && !state.installed.includes(id)).map(id => ({ type: 'material' as const, id, label: `TAKE ${materialName(id).toUpperCase()}`, x: materials[id].x, z: materials[id].z })),
    { type: 'switch', id: 'workshop', label: 'PULL WORKSHOP LEVER', x: -17, z: -8 },
    { type: 'switch', id: 'transit-depot', label: 'RELEASE DEPOT CAGE', x: 17, z: 28 },
    { type: 'ship', id: 'ship', label: 'USE SHIP CONSOLE', x: 0, z: -27 },
  ];
  const direction = new THREE.Vector3();
  function selectTarget(): Target | null {
    camera.getWorldDirection(direction);
    let best: Target | null = null, bestScore = Infinity;
    for (const candidate of candidates()) {
      const d = distance(candidate.x, candidate.z); if (d > (candidate.type === 'material' ? 3.4 : 5.2)) continue;
      const to = new THREE.Vector3(candidate.x - camera.position.x, 1.2 - camera.position.y, candidate.z - camera.position.z).normalize();
      const alignment = direction.dot(to); if (alignment < .62 && d > 2.5) continue;
      const score = (1 - alignment) * 9 + d * .12;
      if (score < bestScore) { bestScore = score; best = candidate; }
    }
    return best;
  }
  function updateHud(): void {
    const diagnostics = el('diagnostics'); diagnostics.replaceChildren();
    for (const id of materialIds) {
      const known = state.claims.some(claim => claim.materialId === id) || state.inventory.includes(id) || state.installed.includes(id) || state.observations.some(observation => observation.id === `${id}-found`);
      const row = document.createElement('div'); row.textContent = `${state.installed.includes(id) ? '◆' : state.inventory.includes(id) ? '◇' : '○'} ${(known ? materialName(id) : systemName[id]).toUpperCase()} · ${state.installed.includes(id) ? 'INSTALLED' : state.inventory.includes(id) ? 'CARRIED' : 'OFFLINE'}`; diagnostics.appendChild(row);
    }
    el('inventory').textContent = state.inventory.length ? state.inventory.map(materialName).join(' · ').toUpperCase() : 'EMPTY';
    el('objective').textContent = isLaunchReady(state) ? 'LAUNCH THE SHIP' : `REPAIR THE SHIP · ${state.installed.length}/3`;
    el('objective-detail').textContent = isLaunchReady(state) ? 'All systems restored. Return to the ship console and launch.' : state.claims.length ? 'Compare the stories in your journal. Find each part, then return to the ship.' : 'Talk to residents. Ask where the missing materials are.';
    el('current-lead').textContent = state.lead && state.lead !== 'seek-more-evidence' ? `SHIP COMPUTER: ${state.lead.replace('@', ' / ').toUpperCase()}` : 'NO LEAD SELECTED';
    const minutes = 42 + Math.floor(state.time / 60), hour = 18 + Math.floor(minutes / 60);
    el('clock').textContent = `${String(hour % 24).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')} / CITY TIME`;
    const x = camera.position.x, z = camera.position.z;
    el('location-label').textContent = z < -23 && Math.abs(x) < 13 ? 'SOUTH CRASH LOT' : x < -17 && Math.abs(z) < 18 ? 'VOSS WORKSHOP' : x > 17 && z < 0 ? 'SALVAGE YARD' : x > 15 && z > 15 ? 'TRANSIT DEPOT' : 'SOUTH DISTRICT';
  }
  function closeConversation(): void { conversationId = null; conversationTicket++; el('conversation').hidden = true; el<HTMLInputElement>('question').value = ''; }
  function renderConversation(id: ResidentId): void {
    const history = el('conversation-history'); history.replaceChildren();
    const turns = state.conversations[id] ?? [];
    for (const turn of turns) {
      const row = document.createElement('div'); row.className = `chat-turn ${turn.speaker}`;
      const who = document.createElement('small'); who.textContent = turn.speaker === 'player' ? 'YOU' : residents[id].name.toUpperCase();
      const words = document.createElement('p'); words.textContent = turn.text;
      row.append(who, words); history.appendChild(row);
    }
    el('conversation').classList.toggle('has-history', turns.length > 0);
    history.scrollTop = history.scrollHeight;
  }
  function openConversation(id: ResidentId): void {
    if (!linkOkay) { toast('Jev link unavailable. Retry to talk.'); return; }
    conversationId = id; conversationTicket++; if (document.pointerLockElement) void document.exitPointerLock();
    el('conversation').hidden = false; el('speaker-name').textContent = residents[id].name; el('speaker-role').textContent = residents[id].role.toUpperCase();
    el('conversation-line').textContent = `${residents[id].name} looks at your helmet, waiting.`;
    el('conversation-context').textContent = state.residents[id].heard.length ? 'You have spoken before. They remember this conversation.' : 'A first encounter.';
    renderConversation(id);
    el('conversation-status').textContent = '';
    const topics = el('topics'); topics.replaceChildren();
    for (const topic of residents[id].topics) {
      const button = document.createElement('button'); button.type = 'button'; button.textContent = topic.toUpperCase();
      button.addEventListener('click', () => { el<HTMLInputElement>('question').value = `Tell me about ${topic}.`; void submitQuestion(); }); topics.appendChild(button);
    }
    el<HTMLInputElement>('question').focus();
  }
  async function submitQuestion(): Promise<void> {
    const id = conversationId; if (!id) return;
    const question = el<HTMLInputElement>('question'); const utterance = question.value.trim(); if (!utterance) return;
    const options = getDialogueOptions(id, utterance, state); const epoch = state.residents[id].epoch; const ticket = ++conversationTicket;
    el('conversation-status').textContent = 'LISTENING…'; el<HTMLButtonElement>('question-form').setAttribute('aria-busy', 'true');
    try {
      const result = await choose({ kind: 'dialogue', actorId: id, epoch, utterance, state, options });
      if (conversationId !== id || ticket !== conversationTicket || state.residents[id].epoch !== epoch) return;
      let reply = result.choiceId === 'clarify' ? clarifications[id] : responses[result.choiceId].text;
      let chatFailed = false;
      if (chatMode !== 'unavailable') {
        el('conversation-status').textContent = 'WAITING FOR REPLY…';
        try {
          const response = await fetch('/api/city-chat', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ residentId: id, utterance, anchorId: result.choiceId, history: (state.conversations[id] ?? []).slice(-12) }) });
          if (!response.ok) throw new Error(`Chat service ${response.status}`);
          const chat = await response.json() as { reply: string };
          if (!chat.reply?.trim() || chat.reply.length > 900) throw new Error('Invalid chat reply');
          reply = chat.reply.trim();
        } catch { chatFailed = true; }
      }
      if (conversationId !== id || ticket !== conversationTicket || state.residents[id].epoch !== epoch) return;
      el('conversation-line').textContent = reply;
      state = recordDialogueExchange(state, id, utterance, reply, result.choiceId); save(); updateHud(); renderConversation(id);
      question.value = '';
      el('conversation-context').textContent = `${residents[id].name} · ${state.residents[id].activity.toUpperCase()} · ${Math.round(result.elapsedMs)} MS`;
      el('conversation-status').textContent = chatFailed ? 'OPENAI CHAT UNAVAILABLE · SOURCE ACCOUNT SHOWN' : result.choiceId === 'clarify' ? 'KEEP TALKING OR ASK ABOUT A SPECIFIC LEAD' : 'SOURCE ADDED TO YOUR JOURNAL [J]';
    } catch { if (ticket === conversationTicket) el('conversation-status').textContent = 'JEV LINK LOST · CLOSE AND RETRY'; }
    finally { el('question-form').removeAttribute('aria-busy'); }
  }
  el('question-form').addEventListener('submit', event => { event.preventDefault(); void submitQuestion(); });
  el('conversation-close').addEventListener('click', closeConversation);
  function renderJournal(): void {
    const claimList = el('claims'); claimList.replaceChildren();
    el('claim-count').textContent = String(state.statements.length).padStart(2, '0');
    if (!state.statements.length) { const empty = document.createElement('p'); empty.textContent = 'No sourced accounts yet. Ask people about the city and your ship.'; claimList.appendChild(empty); }
    for (const statement of state.statements) {
      const claim = state.claims.find(candidate => candidate.id === statement.id);
      const card = document.createElement('div'); card.className = 'journal-card';
      const title = document.createElement('strong'); title.textContent = `${residents[statement.speakerId].name} · ${claim ? materialName(claim.materialId) : 'City account'}`;
      const quote = document.createElement('p'); quote.textContent = statement.text;
      const source = document.createElement('small'); source.textContent = claim ? `CLAIMS: ${locName[claim.locationId].toUpperCase()} · ${claim.id}` : `HEARD ACCOUNT · ${statement.id}`;
      const conflicts = claim ? state.claims.filter(other => other.materialId === claim.materialId && other.locationId !== claim.locationId) : [];
      if (conflicts.length) source.textContent += ` · CONFLICTS WITH ${conflicts.map(other => residents[other.speakerId].name.toUpperCase()).join(', ')}`;
      card.append(title, quote, source); claimList.appendChild(card);
    }
    if (state.observations.length) { const heading = document.createElement('h3'); heading.textContent = 'OBSERVED IN THE FIELD'; claimList.appendChild(heading); }
    for (const observation of state.observations) { const card = document.createElement('div'); card.className = 'journal-card'; const title = document.createElement('strong'); title.textContent = locName[observation.locationId]; const note = document.createElement('p'); note.textContent = observation.text; card.append(title, note); claimList.appendChild(card); }
    const assumptions = el('assumptions'); assumptions.replaceChildren();
    for (const id of materialIds) {
      const assumed = state.assumptions[id]; if (!assumed) continue;
      const card = document.createElement('div'); card.className = 'assumption-card';
      const title = document.createElement('strong'); title.textContent = `${materialName(id)} → ${locName[assumed.locationId]}`;
      const detail = document.createElement('div'); detail.textContent = `${assumed.status.toUpperCase()} · SOURCES: ${assumed.evidenceIds.join(', ') || 'PERSONAL HUNCH'}`;
      card.append(title, detail); assumptions.appendChild(card);
    }
    const repair = el('repair-status'); repair.replaceChildren(); for (const id of materialIds) { const row = document.createElement('div'); row.className = 'repair-row'; row.textContent = `${state.installed.includes(id) ? '◆ INSTALLED' : state.inventory.includes(id) ? '◇ CARRIED' : '○ OFFLINE'} · ${(state.claims.some(claim => claim.materialId === id) || state.inventory.includes(id) || state.installed.includes(id) ? materialName(id) : systemName[id]).toUpperCase()}`; repair.appendChild(row); }
    for (const option of el<HTMLSelectElement>('assumption-material').options) { const id = option.value as MaterialId; option.textContent = state.claims.some(claim => claim.materialId === id) || state.inventory.includes(id) || state.installed.includes(id) ? materialName(id) : systemName[id]; }
    const evidence = el<HTMLSelectElement>('assumption-evidence'); evidence.replaceChildren();
    const hunch = document.createElement('option'); hunch.value = ''; hunch.textContent = 'PERSONAL HUNCH'; evidence.appendChild(hunch);
    for (const statement of state.statements) { const option = document.createElement('option'); option.value = statement.id; option.textContent = `${residents[statement.speakerId].name}: ${statement.text.slice(0, 72)}`; evidence.appendChild(option); }
    for (const observation of state.observations) { const option = document.createElement('option'); option.value = observation.id; option.textContent = `OBSERVED: ${observation.text}`; evidence.appendChild(option); }
  }
  function closeJournal(): void { leadTicket++; el('journal').hidden = true; }
  function openJournal(): void { if (document.pointerLockElement) void document.exitPointerLock(); el('journal').hidden = false; renderJournal(); }
  el('journal-close').addEventListener('click', closeJournal);
  for (const id of materialIds) { const option = document.createElement('option'); option.value = id; option.textContent = materialName(id); el<HTMLSelectElement>('assumption-material').appendChild(option); }
  el('assumption-form').addEventListener('submit', event => {
    event.preventDefault(); const material = el<HTMLSelectElement>('assumption-material').value as MaterialId;
    const locationId = el<HTMLSelectElement>('assumption-location').value as LocationId;
    const evidence = Array.from(el<HTMLSelectElement>('assumption-evidence').selectedOptions).map(option => option.value).filter(Boolean);
    try { state = setAssumption(state, material, locationId, evidence); save(); renderJournal(); toast('Assumption recorded'); } catch { toast('That source is not in your journal'); }
  });
  el('analyze').addEventListener('click', async () => {
    const ticket = ++leadTicket; const status = el('analysis-status'); status.textContent = 'ANALYZING NOTES…';
    const options = getAvailableLeads(state);
    try { const result = await choose({ kind: 'lead', actorId: 'ship-computer', epoch: ticket, state, options }); if (ticket !== leadTicket) return;
      state = applyLeadChoice(state, result.choiceId); const supporting = state.claims.filter(claim => `${claim.materialId}@${claim.locationId}` === result.choiceId).map(claim => residents[claim.speakerId].name);
      status.textContent = result.choiceId === 'seek-more-evidence' ? 'Not enough evidence. Ask more people.' : `SUGGESTED: ${result.choiceId.replace('@', ' at ')}. SOURCE: ${supporting.join(', ') || 'your notes'}. This is a lead, not proof.`; save(); updateHud();
    } catch { if (ticket === leadTicket) status.textContent = 'Jev link unavailable. Retry when connected.'; }
  });
  function interact(): void {
    if (!target) return;
    if (target.type === 'resident') { openConversation(target.id as ResidentId); return; }
    if (target.type === 'switch') { const id = target.id as LocationId; state = recordObservation({ ...state, access: { ...state.access, [id]: true } }, `${id}-switch`, id === 'workshop' ? 'The yellow lever released the workshop cabinet.' : 'The green switch released the depot maintenance cage.', id); toast(id === 'workshop' ? 'Workshop cabinet released' : 'Depot maintenance cage released'); save(); return; }
    if (target.type === 'material') { const id = target.id as MaterialId; const updated = collectMaterial(state, id);
      if (updated === state) toast(state.access[materials[id].location] ? 'Move closer to collect this part.' : `Access blocked. Look for a switch near ${locName[materials[id].location]}.`);
      else { state = recordObservation(updated, `${id}-found`, `Found ${materialName(id)} at ${locName[materials[id].location]}.`, materials[id].location); toast(`${materialName(id)} secured. Return to your ship.`); save(); updateHud(); }
      return; }
    if (target.type === 'ship') {
      if (isLaunchReady(state)) { state = { ...state, launched: true }; save(); el('ending').hidden = false; el('ending-record').textContent = `${state.claims.length} CLAIMS HEARD · ${Object.keys(state.assumptions).length} ASSUMPTIONS · ${Math.round(state.time / 60)} MINUTES IN THE CITY`; if (document.pointerLockElement) void document.exitPointerLock(); return; }
      if (state.inventory.length) { const id = state.inventory[0]; const updated = installMaterial(state, id); if (updated !== state) { state = updated; toast(`${materialName(id)} installed · ${state.installed.length}/3`); save(); updateHud(); } }
      else toast('Ship diagnostics: three missing modules. Ask around and search the district.');
    }
  }
  el('restart').addEventListener('click', () => { localStorage.removeItem(CITY_SAVE_KEY); location.reload(); });
  el('enter').addEventListener('click', async () => { entered = true; startCityAudio(); try { await renderer.domElement.requestPointerLock(); } catch { entry.classList.add('hidden'); toast('Pointer lock unavailable. Use keyboard to move.'); } });
  renderer.domElement.addEventListener('click', () => { if (entered && document.pointerLockElement !== renderer.domElement && el('conversation').hidden && el('journal').hidden) void renderer.domElement.requestPointerLock(); });
  document.addEventListener('pointerlockchange', () => { entry.classList.toggle('hidden', entered); el('enter').textContent = 'RESUME CITY'; });
  window.addEventListener('keydown', event => {
    if (event.repeat || state.launched) return;
    if (event.key === 'Escape') { if (!el('conversation').hidden) closeConversation(); else if (!el('journal').hidden) closeJournal(); return; }
    if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
    if (event.code === 'KeyJ') { if (el('journal').hidden) openJournal(); else closeJournal(); return; }
    if (!el('conversation').hidden || !el('journal').hidden || !entered) return;
    if (event.code === 'KeyE') interact();
  });
  window.addEventListener('resize', () => { camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); renderer.setSize(innerWidth, innerHeight); });
  if (debug) Object.assign(window, { __cityDebug: { getState: () => state, getTarget: () => target, teleport: (x: number, z: number, lookX: number, lookZ: number) => controls.teleport(x, z, new THREE.Vector3(lookX, 1.5, lookZ)) } });
  async function decideActivity(id: ResidentId): Promise<void> {
    if (pendingActivities.has(id) || !linkOkay) return; pendingActivities.add(id);
    const dialogueEpoch = state.residents[id].epoch;
    const epoch = Math.floor(state.time * 1000) + residentIds.indexOf(id);
    try { const result = await choose({ kind: 'activity', actorId: id, epoch, state, options: getValidActivities(id, state) });
      state = applyResidentActivity(state, id, result.choiceId, dialogueEpoch, state.time + 13 + residentIds.indexOf(id) * 3);
    } catch { state.residents[id].nextDecisionAt = state.time + 5; }
    finally { pendingActivities.delete(id); }
  }
  let previous = performance.now();
  renderer.setAnimationLoop(() => {
    const now = performance.now(), dt = Math.min((now - previous) / 1000, .07); previous = now;
    if (entered && el('conversation').hidden && el('journal').hidden && !state.launched) { const before = camera.position.clone(); controls.update(dt); if (habitat.blocks(camera.position.x, camera.position.z)) { camera.position.x = before.x; camera.position.z = before.z; } }
    if (entered && !state.launched) state.time += dt; state.player = { x: camera.position.x, z: camera.position.z };
    residentViews.sync(state, state.time, conversationId); materialViews.sync(state, state.time);
    target = selectTarget(); const prompt = el('interaction'); prompt.textContent = target && entered && el('conversation').hidden && el('journal').hidden ? `[E] ${target.label}` : ''; prompt.classList.toggle('visible', !!prompt.textContent);
    if (now > toastUntil) el('toast').classList.remove('visible');
    if (state.time - lastHud > .3) { updateHud(); lastHud = state.time; }
    if (entered && state.time - lastSave > 8) { save(); lastSave = state.time; }
    if (entered && state.time - lastActivityTick > 1.5) { lastActivityTick = state.time; for (const id of residentIds) if (state.residents[id].nextDecisionAt <= state.time) void decideActivity(id); }
    renderer.render(scene, camera);
  });
  updateHud(); if (state.launched) { el('ending').hidden = false; entered = true; entry.classList.add('hidden'); }
}
