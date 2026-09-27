import { afterEach, expect, it, vi } from 'vitest';
import { PerspectiveCamera, Vector3 } from 'three';
import { createControls } from '../src/game/controls';

afterEach(() => vi.unstubAllGlobals());

function press(target: EventTarget, type: 'keydown' | 'keyup', code: string): void {
  const event = new Event(type);
  Object.defineProperty(event, 'code', { value: code });
  target.dispatchEvent(event);
}

it('holds Shift to sprint without lowering the camera', () => {
  const events = new EventTarget();
  vi.stubGlobal('window', events);
  const camera = new PerspectiveCamera();
  const controls = createControls(camera, {} as HTMLCanvasElement, () => 0);
  controls.teleport(0, 0, new Vector3(0, 1.75, -5));
  press(events, 'keydown', 'KeyW');
  controls.update(.05);
  const walkingDistance = Math.abs(camera.position.z);
  controls.teleport(0, 0, new Vector3(0, 1.75, -5));
  press(events, 'keydown', 'ShiftLeft');
  controls.update(.05);
  expect(Math.abs(camera.position.z)).toBeGreaterThan(walkingDistance * 1.8);
  expect(camera.position.y).toBeCloseTo(1.75);
  controls.dispose();
});

it('lets the player continue past the old city boundary', () => {
  const events = new EventTarget();
  vi.stubGlobal('window', events);
  const camera = new PerspectiveCamera();
  const controls = createControls(camera, {} as HTMLCanvasElement, () => 0);
  controls.teleport(145.9, 0, new Vector3(145.9, 1.75, -5));
  press(events, 'keydown', 'KeyD');
  controls.update(.05);
  expect(camera.position.x).toBeGreaterThan(146);
  controls.dispose();
});
