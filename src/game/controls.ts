import * as THREE from 'three';

export interface Controls {
  update(dt: number): void;
  readonly position: THREE.Vector3;
  readonly isHidden: boolean;
  dispose(): void;
}

export function createControls(
  camera: THREE.PerspectiveCamera,
  canvas: HTMLCanvasElement,
  heightAt: (x: number, z: number) => number,
): Controls {
  const keys = new Set<string>();
  let yaw = -2.1;
  let pitch = -.08;
  const keyDown = (event: KeyboardEvent) => {
    if (event.code === 'Escape' && document.pointerLockElement === canvas) {
      void document.exitPointerLock();
      return;
    }
    keys.add(event.code);
  };
  const keyUp = (event: KeyboardEvent) => { keys.delete(event.code); };
  const mouseMove = (event: MouseEvent) => {
    if (document.pointerLockElement !== canvas) return;
    yaw -= event.movementX * .002;
    pitch = THREE.MathUtils.clamp(pitch - event.movementY * .002, -1.45, 1.45);
  };
  window.addEventListener('keydown', keyDown);
  window.addEventListener('keyup', keyUp);
  window.addEventListener('mousemove', mouseMove);

  return {
    get position() { return camera.position; },
    get isHidden() { return keys.has('ShiftLeft') || keys.has('ShiftRight'); },
    update(dt) {
      const forward = Number(keys.has('KeyW')) - Number(keys.has('KeyS'));
      const side = Number(keys.has('KeyD')) - Number(keys.has('KeyA'));
      const direction = new THREE.Vector3(Math.sin(yaw), 0, Math.cos(yaw));
      const right = new THREE.Vector3(Math.cos(yaw), 0, -Math.sin(yaw));
      const move = direction.multiplyScalar(-forward).addScaledVector(right, side);
      if (move.lengthSq() > 0) move.normalize().multiplyScalar((this.isHidden ? 2 : 5.2) * Math.min(dt, .05));
      camera.position.x = THREE.MathUtils.clamp(camera.position.x + move.x, -146, 146);
      camera.position.z = THREE.MathUtils.clamp(camera.position.z + move.z, -146, 146);
      const targetY = heightAt(camera.position.x, camera.position.z) + (this.isHidden ? 1.12 : 1.75);
      camera.position.y = THREE.MathUtils.lerp(camera.position.y, targetY, Math.min(1, dt * 12));
      camera.rotation.order = 'YXZ';
      camera.rotation.set(pitch, yaw, 0);
    },
    dispose() {
      window.removeEventListener('keydown', keyDown);
      window.removeEventListener('keyup', keyUp);
      window.removeEventListener('mousemove', mouseMove);
    },
  };
}
