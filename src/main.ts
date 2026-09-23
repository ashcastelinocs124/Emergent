import * as THREE from 'three';
import { createHabitat } from './game/habitat';
import { createControls } from './game/controls';
import { createInitialWorld, applyDecision, stepWorld } from './game/world';
import { createDecisionScheduler } from './game/scheduler';
import { getValidIntents } from './shared/species';
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
  scene.background = new THREE.Color(0x819ca1);
  scene.fog = new THREE.FogExp2(0x819ca1, .008);
  const sun = new THREE.DirectionalLight(0xffe3b8, 2.6);
  sun.position.set(-40, 80, -30);
  sun.castShadow = true;
  sun.shadow.mapSize.set(2048, 2048);
  sun.shadow.camera.left = -100;
  sun.shadow.camera.right = 100;
  sun.shadow.camera.top = 100;
  sun.shadow.camera.bottom = -100;
  scene.add(sun, new THREE.HemisphereLight(0xb9d6d7, 0x344640, 2));

  const habitat = createHabitat(scene);
  const camera = new THREE.PerspectiveCamera(76, window.innerWidth / window.innerHeight, .1, 500);
  camera.position.copy(habitat.shipPosition).add(new THREE.Vector3(-8, 1.75, 10));
  const controls = createControls(camera, renderer.domElement, habitat.heightAt);
  let world = createInitialWorld(42, habitat.shipPosition, habitat.nestPosition);
  let decisionCount = 0;
  let decisionErrors = 0;
  const scheduler = createDecisionScheduler(async (input: DecisionInput): Promise<DecisionResult> => {
    const response = await fetch('/api/decision', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(input) });
    if (!response.ok) throw new Error(`Decision service: ${response.status}`);
    return response.json() as Promise<DecisionResult>;
  });
  const debug = new URLSearchParams(window.location.search).has('debug');
  const debugDisplay = debug ? document.createElement('pre') : null;
  if (debugDisplay) {
    debugDisplay.id = 'debug-state';
    debugDisplay.style.cssText = 'position:fixed;right:12px;top:12px;z-index:30;color:#d7fbe8;background:#071918dc;padding:12px;font:12px/1.5 monospace;pointer-events:none';
    document.body.appendChild(debugDisplay);
  }
  enter.addEventListener('click', async () => {
    try {
      await renderer.domElement.requestPointerLock();
    } catch {
      hint.textContent = 'Pointer lock unavailable in this browser';
      hint.classList.add('visible');
    }
  });
  document.addEventListener('pointerlockchange', () => {
    const locked = document.pointerLockElement === renderer.domElement;
    entry.classList.toggle('hidden', locked);
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
  const fixedStep = .05;
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    const frameDt = Math.min((now - previousFrame) / 1000, .1);
    controls.update(frameDt);
    previousFrame = now;
    world.player.position = { x: controls.position.x, y: controls.position.y, z: controls.position.z };
    world.player.hidden = controls.isHidden;
    accumulator += frameDt;
    while (accumulator >= fixedStep) {
      world = stepWorld(world, fixedStep).world;
      accumulator -= fixedStep;
      for (const creature of world.creatures) {
        const result = scheduler.takeReady(creature.id);
        if (result) {
          const applied = applyDecision(world, result);
          if (applied !== world) { world = applied; decisionCount++; }
        }
        const error = scheduler.takeError(creature.id);
        if (error) {
          decisionErrors++;
          creature.nextDecisionAt = world.time + 2;
        }
        if (creature.alive && !creature.currentIntent && world.time >= creature.nextDecisionAt) {
          const intents = getValidIntents(creature, world);
          if (intents.length) scheduler.issue({ creatureId: creature.id, epoch: creature.decisionEpoch, world, intents });
        }
      }
    }
    if (debugDisplay) {
      const active = world.creatures.filter(creature => creature.currentIntent);
      debugDisplay.textContent = `SIM ${world.time.toFixed(1)}s\nACTIVE ${active.length}/30\nJEV DECISIONS ${decisionCount}\nERRORS ${decisionErrors}\n${active.slice(0, 12).map(creature => `${creature.id}: ${creature.currentIntent?.action}`).join('\n')}`;
    }
    renderer.render(scene, camera);
  });
} catch (error) {
  mount.innerHTML = '<p class="unsupported">This expedition needs a browser with WebGL 2 enabled.</p>';
  enter.disabled = true;
  console.error(error);
}
