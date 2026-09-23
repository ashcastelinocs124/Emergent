import * as THREE from 'three';
import { createHabitat } from './game/habitat';
import { createControls } from './game/controls';
import './style.css';

const mount = document.querySelector<HTMLDivElement>('#game')!;
const entry = document.querySelector<HTMLDivElement>('#entry')!;
const enter = document.querySelector<HTMLButtonElement>('#enter')!;
const hint = document.querySelector<HTMLDivElement>('#game-hint')!;

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
  renderer.setAnimationLoop(() => {
    const now = performance.now();
    controls.update((now - previousFrame) / 1000);
    previousFrame = now;
    renderer.render(scene, camera);
  });
} catch (error) {
  mount.innerHTML = '<p class="unsupported">This expedition needs a browser with WebGL 2 enabled.</p>';
  enter.disabled = true;
  console.error(error);
}
