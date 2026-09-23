import * as THREE from 'three';
import { createHabitat } from './game/habitat';
import { createControls } from './game/controls';
import { createInitialWorld, applyDecision, stepWorld } from './game/world';
import { createDecisionScheduler } from './game/scheduler';
import { createCreatureViews } from './game/creatures';
import { playCreatureCue, playSuitAlert, setAudioListener, unlockAudio } from './game/audio';
import { getValidIntents } from './shared/species';
import { tickSuit, interact, dropItem, useItem, repairShip, recoverAtShip } from './shared/survival';
import { createVisor, setDecisionConnection } from './ui/visor';
import { creatureVisibility, findInteractionTarget } from './game/player';
import { createItemViews } from './game/items';
import { emptyJournal, recordObservation } from './shared/journal';
import { createJournalUI } from './ui/journal';
import { createPersistence } from './game/persistence';
import { createJevMetrics } from './game/metrics';
import type { DecisionInput, DecisionResult } from './shared/model';
import './style.css';

const mount = document.querySelector<HTMLDivElement>('#game')!;
const entry = document.querySelector<HTMLDivElement>('#entry')!;
const enter = document.querySelector<HTMLButtonElement>('#enter')!;
const hint = document.querySelector<HTMLDivElement>('#game-hint')!;
const modeBadge = document.querySelector<HTMLDivElement>('#mode-badge')!;

void fetch('/api/health').then(response => response.json()).then((health: { mode?: string }) => {
  if (health.mode === 'fake') {
    modeBadge.textContent = 'TEST SIMULATION';
    modeBadge.hidden = false;
  }
}).catch(() => {});

try {
  const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.45;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  mount.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  const daySky = new THREE.Color(0x819ca1);
  const duskSky = new THREE.Color(0x323c5d);
  const duskHorizon = new THREE.Color(0x77667d);
  const duskZenith = new THREE.Color(0x101c40);
  scene.background = daySky.clone();
  scene.fog = new THREE.FogExp2(0x819ca1, .008);
  const skyMaterial = new THREE.ShaderMaterial({
    uniforms: { horizon: { value: new THREE.Color(0xa6b8b2) }, zenith: { value: new THREE.Color(0x425f70) } },
    vertexShader: 'varying vec3 vPosition; void main(){vPosition=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',
    fragmentShader: 'uniform vec3 horizon;uniform vec3 zenith;varying vec3 vPosition;void main(){float t=smoothstep(-0.16,0.8,normalize(vPosition).y);gl_FragColor=vec4(mix(horizon,zenith,t),1.0);}',
    side: THREE.BackSide, depthWrite: false,
  });
  const sky = new THREE.Mesh(new THREE.SphereGeometry(420, 32, 20), skyMaterial);
  sky.renderOrder = -100;
  scene.add(sky);
  const sun = new THREE.DirectionalLight(0xffe3b8, 2.6);
  sun.position.set(-40, 80, -30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -100;
  sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 100;
  sun.shadow.camera.bottom = -100;
  scene.add(sun, new THREE.HemisphereLight(0xb9d6d7, 0x344640, 2));

  const habitat = createHabitat(scene);
  const camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, .1, 500);
  camera.position.copy(habitat.shipPosition).add(new THREE.Vector3(-5, 1.75, 8));
  const controls = createControls(camera, renderer.domElement, habitat.heightAt);
  const query = new URLSearchParams(window.location.search);
  const debug = query.has('debug');
  const creatureCount = debug ? Math.max(20, Math.min(40, Number(query.get('creatures')) || 30)) : 30;
  const persistence = createPersistence(localStorage);
  let saved: ReturnType<typeof persistence.load> = null;
  try { saved = persistence.load(); }
  catch (error) {
    const message = error instanceof Error ? error.message : 'Unable to load expedition save.';
    document.querySelector<HTMLElement>('.entry-copy')!.textContent = message;
  }
  let world = saved?.world ?? createInitialWorld(42, habitat.shipPosition, habitat.nestPosition, creatureCount);
  if (saved) camera.position.set(world.player.position.x, world.player.position.y, world.player.position.z);
  const creatureViews = createCreatureViews(scene, world.creatures);
  const itemViews = createItemViews(scene, world.items);
  const visor = createVisor(document.querySelector<HTMLElement>('#visor')!);
  let journal = saved?.journal ?? emptyJournal();
  const journalUI = createJournalUI(document.querySelector<HTMLElement>('#journal')!, () => journal,
    updated => { journal = updated; }, open => {
      if (open && document.pointerLockElement) document.exitPointerLock();
      entry.classList.toggle('hidden', open || document.pointerLockElement === renderer.domElement);
    });
  let ended = false;
  const showEnding = () => {
    ended = true;
    document.querySelector<HTMLElement>('#ending')!.hidden = false;
    document.querySelector<HTMLElement>('#ending-record')!.textContent =
      `${journal.observations.length} SIGHTINGS · ${journal.hypotheses.length} THEORIES · ${Math.round(world.time)}s SURFACE TIME`;
    if (document.pointerLockElement) document.exitPointerLock();
  };
  document.querySelector<HTMLButtonElement>('#ending-restart')!.addEventListener('click', () => {
    persistence.clear(); location.reload();
  });
  let target = findInteractionTarget(world, camera);
  window.addEventListener('keydown', event => {
    if (event.repeat) return;
    if (ended) return;
    if (event.code === 'KeyJ' && !(event.target instanceof HTMLInputElement)) {
      journalUI.toggle();
      return;
    }
    if (journalUI.isOpen()) return;
    if (event.code === 'KeyQ') {
      world.player.scannerOn = !world.player.scannerOn && world.player.power > 0;
      visor.message(world.player.scannerOn ? 'SCANNER ACTIVE' : 'SCANNER OFFLINE');
    }
    if (event.code === 'KeyE' && target) {
      if (target.id === 'ship-console') {
        const repaired = repairShip(world);
        if (repaired !== world) { world = repaired; persistence.write(world, journal); visor.message('DRIVE REGULATOR INSTALLED'); }
        else if (world.componentInstalled) showEnding();
        else visor.message('DRIVE REGULATOR REQUIRED');
      } else {
        const picked = interact(world, target.id);
        if (picked !== world) {
          const item = world.items.find(candidate => candidate.id === target!.id);
          world = picked;
          visor.message(item?.kind === 'egg' ? 'EGG COLLECTED · MOVEMENT DETECTED' : `${item?.kind.toUpperCase()} SECURED`);
          if (item?.kind === 'egg') for (const creature of world.creatures) {
            if (creature.speciesId !== 'guardian') continue;
            const visibility = creatureVisibility(camera, creature.position);
            if (!world.player.scannerOn && visibility.distance > 22) continue;
            journal = recordObservation(journal, { id: `egg-${item.id}-${creature.id}`, at: world.time,
              creatureId: creature.id, speciesId: creature.speciesId, action: 'EGG_PICKUP',
              position: { ...creature.position }, carriedItem: 'egg', note: 'Egg taken while this individual was in view.' }, visibility);
          }
          if (item?.kind === 'egg') for (const creature of world.creatures) {
            if (creature.speciesId === 'guardian' && creature.memory.events.some(fact => fact.type === 'egg_stolen'))
              playCreatureCue(creature.id, 'guardian-warning', creature.position);
          }
        }
      }
    }
    if (event.code === 'KeyR' && world.player.inventory.length) {
      const item = world.player.inventory.at(-1)!;
      world = dropItem(world, item.id);
      visor.message(`${item.kind.toUpperCase()} DROPPED`);
    }
    if (event.code === 'KeyF') {
      const egg = world.player.inventory.find(item => item.kind === 'egg');
      if (egg) { world = useItem(world, egg.id); visor.message('NUTRIENTS RESTORED'); }
    }
  });
  let decisionCount = 0;
  let decisionErrors = 0;
  let discardedDecisions = 0;
  const jevMetrics = createJevMetrics();
  let lastMetricsLogAt = 0;
  let consecutiveErrors = 0;
  let firstErrorAt: number | null = null;
  let connection: 'ready' | 'waiting' | 'paused' = 'ready';
  const setConnection = (status: typeof connection) => { connection = status; setDecisionConnection(status); };
  let wasSheltered = true;
  const scheduler = createDecisionScheduler(async (input: DecisionInput): Promise<DecisionResult> => {
    const response = await fetch('/api/decision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    if (!response.ok) throw new Error(`Decision service: ${response.status}`);
    return response.json() as Promise<DecisionResult>;
  });
  document.querySelector<HTMLButtonElement>('#connection-retry')!.addEventListener('click', async () => {
    const button = document.querySelector<HTMLButtonElement>('#connection-retry')!;
    button.disabled = true;
    try {
      const response = await fetch('/api/health');
      if (!response.ok) throw new Error('Service still unavailable');
      for (const creature of world.creatures) {
        if (!creature.currentIntent) {
          creature.decisionEpoch++;
          creature.nextDecisionAt = world.time;
          scheduler.invalidate(creature.id, creature.decisionEpoch);
        }
      }
      consecutiveErrors = 0;
      firstErrorAt = null;
      setConnection('ready');
      visor.message('JEV LINK RESTORED');
    } catch {
      visor.message('DECISION SERVICE STILL UNAVAILABLE');
    } finally { button.disabled = false; }
  });
  document.querySelector<HTMLButtonElement>('#connection-title')!.addEventListener('click', () => {
    location.reload();
  });
  const debugDisplay = debug ? document.createElement('pre') : null;
  if (debug) Object.assign(window, { __alienDebug: { camera, scene, renderer, getWorld: () => world,
    teleport: (x: number, z: number, lookX: number, lookZ: number) => controls.teleport(x, z,
      new THREE.Vector3(lookX, habitat.heightAt(lookX, lookZ) + 1, lookZ)) } });
  if (debugDisplay) {
    debugDisplay.id = 'debug-state';
    debugDisplay.style.cssText = 'position:fixed;right:12px;top:12px;z-index:30;color:#d7fbe8;background:#071918dc;padding:12px;font:12px/1.5 monospace;pointer-events:none';
    document.body.appendChild(debugDisplay);
  }
  enter.addEventListener('click', async () => {
    unlockAudio();
    try {
      await renderer.domElement.requestPointerLock();
    } catch {
      hint.textContent = 'Pointer lock unavailable in this browser';
      hint.classList.add('visible');
    }
  });
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === renderer.domElement;
    entry.classList.toggle('hidden', locked || journalUI.isOpen());
    hint.classList.toggle('visible', !locked);
    enter.textContent = locked ? 'Enter expedition' : 'Resume expedition';
  });
  window.addEventListener('resize', () => {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
  });
  let previousFrame = performance.now();
  let accumulator = 0;
  let nextObservationAt = 0;
  const fixedStep = .05;
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const frameDt = Math.min((now - previousFrame) / 1000, .1);
    if (!journalUI.isOpen() && !ended) {
      controls.update(frameDt);
      for (const creature of world.creatures) {
        if (!creature.alive) continue;
        const radius = creature.speciesId === 'guardian' ? 3.25 : 1.35;
        const dx = camera.position.x - creature.position.x;
        const dz = camera.position.z - creature.position.z;
        const distance = Math.hypot(dx, dz);
        if (distance < radius) {
          const scale = radius / Math.max(distance, .001);
          camera.position.x = creature.position.x + (distance < .001 ? radius : dx * scale);
          camera.position.z = creature.position.z + dz * scale;
          camera.position.y = habitat.heightAt(camera.position.x, camera.position.z) + (controls.isHidden ? 1.12 : 1.75);
        }
      }
    }
    previousFrame = now;
    world.player.position = { x: controls.position.x, y: controls.position.y, z: controls.position.z };
    setAudioListener(world.player.position);
    world.player.hidden = controls.isHidden;
    const sheltered = Math.hypot(world.player.position.x - world.shipPosition.x,
      world.player.position.z - world.shipPosition.z) <= 10;
    if (!(journalUI.isOpen() && sheltered) && connection !== 'paused' && !ended) accumulator += frameDt;
    while (accumulator >= fixedStep) {
      const stepped = stepWorld(world, fixedStep);
      world = stepped.world;
      world.player = tickSuit(world.player, fixedStep, world.shipPosition);
      if (sheltered && !wasSheltered) persistence.write(world, journal);
      wasSheltered = sheltered;
      playSuitAlert(world.player.air);
      if (world.player.health <= 0) {
        world = recoverAtShip(world);
        camera.position.set(world.shipPosition.x + 2, habitat.heightAt(world.shipPosition.x + 2, world.shipPosition.z + 5) + 1.75, world.shipPosition.z + 5);
        visor.message('SUIT FAILURE · EMERGENCY RETURN TO SHIP', 5000);
      }
      for (const event of stepped.events) {
        if (event.type === 'attacked') {
          const species = world.creatures.find(creature => creature.id === event.creatureId)?.speciesId;
          if (species === 'guardian') playCreatureCue(event.creatureId, 'guardian-warning', event.position ?? world.player.position);
          else if (species === 'stalker') playCreatureCue(event.creatureId, 'stalker-hunt', event.position ?? world.player.position);
        }
      }
      accumulator -= fixedStep;
      for (const creature of world.creatures) {
        const result = scheduler.takeReady(creature.id);
        if (result) {
          const applied = applyDecision(world, result);
          if (applied !== world) {
            world = applied; decisionCount++; jevMetrics.record(result, world.time);
            const decided = world.creatures.find(candidate => candidate.id === result.creatureId);
            if (decided) {
              if (decided.speciesId === 'guardian' && result.intent.action === 'FOLLOW' &&
                decided.memory.events.some(fact => fact.type === 'egg_stolen'))
                playCreatureCue(decided.id, 'guardian-recognition', decided.position);
              if (decided.speciesId === 'grazer' && result.intent.action === 'FLEE')
                playCreatureCue(decided.id, 'grazer-alarm', decided.position);
              if (decided.speciesId === 'stalker' && result.intent.action === 'HUNT')
                playCreatureCue(decided.id, 'stalker-hunt', decided.position);
            }
            consecutiveErrors = 0; firstErrorAt = null;
            if (connection === 'waiting') setConnection('ready');
          } else discardedDecisions++;
        }
        const error = scheduler.takeError(creature.id);
        if (error) {
          decisionErrors++;
          consecutiveErrors++;
          firstErrorAt ??= world.time;
          if (connection === 'ready') setConnection('waiting');
          creature.nextDecisionAt = world.time + 2;
        }
        if (creature.alive && !creature.currentIntent && world.time >= creature.nextDecisionAt) {
          const intents = getValidIntents(creature, world);
          if (intents.length) scheduler.issue({ creatureId: creature.id, epoch: creature.decisionEpoch, world, intents });
        }
      }
      if (firstErrorAt !== null && consecutiveErrors >= 3 && world.time - firstErrorAt >= 3 &&
        world.creatures.every(creature => !creature.currentIntent)) {
        persistence.write(world, journal);
        setConnection('paused');
        accumulator = 0;
        break;
      }
      if (world.time >= nextObservationAt) {
        nextObservationAt = world.time + .5;
        for (const creature of world.creatures) {
          if (!creature.alive || !creature.currentIntent) continue;
          const visibility = creatureVisibility(camera, creature.position);
          if (!world.player.scannerOn && visibility.distance > 22) continue;
          const updated = recordObservation(journal, { id: `sighting-${creature.id}-${creature.decisionEpoch}`,
            at: world.time, creatureId: creature.id, speciesId: creature.speciesId,
            action: creature.currentIntent.action, position: { ...creature.position },
            carriedItem: world.player.inventory.find(item => item.kind === 'egg')?.kind ?? null,
            note: `Observed ${creature.id} in the field.` }, visibility);
          if (updated !== journal) { journal = updated; if (journalUI.isOpen()) journalUI.render(); }
        }
      }
      if (world.time - lastMetricsLogAt >= 60) {
        lastMetricsLogAt = world.time;
        console.info('Jev session metrics', { ...jevMetrics.summary(world.time),
          rejectedOrStale: discardedDecisions, serviceErrors: decisionErrors });
      }
    }
    if (debugDisplay) {
      const active = world.creatures.filter(creature => creature.currentIntent);
      const metrics = jevMetrics.summary(world.time);
      debugDisplay.textContent = `SIM ${world.time.toFixed(1)}s\nACTIVE ${active.length}/${world.creatures.length}\nJEV DECISIONS ${decisionCount} (${metrics.decisionsPerMinute}/MIN)\nP50/P95 ${metrics.p50Ms.toFixed(0)}/${metrics.p95Ms.toFixed(0)}ms\nTOKENS ${metrics.inputTokens}/${metrics.outputTokens}\nEST COST $${metrics.estimatedUsd.toFixed(5)}\nERRORS ${decisionErrors} · STALE ${discardedDecisions}\n${active.slice(0, 12).map(creature => `${creature.id}: ${creature.currentIntent?.action}`).join('\n')}`;
    }
    const dusk = Math.max(0, Math.min(1, (world.time - 240) / 120));
    (scene.background as THREE.Color).copy(daySky).lerp(duskSky, dusk);
    if (scene.fog instanceof THREE.FogExp2) scene.fog.color.copy(scene.background as THREE.Color);
    sky.position.copy(camera.position);
    (skyMaterial.uniforms.horizon.value as THREE.Color).set(0xa6b8b2).lerp(duskHorizon, dusk);
    (skyMaterial.uniforms.zenith.value as THREE.Color).set(0x425f70).lerp(duskZenith, dusk);
    sun.intensity = 2.6 - dusk * 1.5;
    creatureViews.sync(world, accumulator / fixedStep);
    itemViews.sync(world);
    target = findInteractionTarget(world, camera);
    visor.sync(world, target);
    renderer.render(scene, camera);
  });
} catch (error) {
  mount.innerHTML = '<p class="unsupported">This expedition needs a browser with WebGL 2 enabled.</p>';
  enter.disabled = true;
  console.error(error);
}
