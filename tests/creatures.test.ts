import { describe, expect, test } from 'vitest';
import * as THREE from 'three';
import { createCreatureViews } from '../src/game/creatures';
import { createInitialWorld } from '../src/game/world';
import { at } from './fixtures';

describe('creature scene views', () => {
  test('creates one visible, distinct scene object per creature and disposes them', () => {
    const scene = new THREE.Scene();
    const world = createInitialWorld(3, at(-12, 14), at(58, -42));
    const views = createCreatureViews(scene, world.creatures);
    expect(scene.children).toHaveLength(30);
    expect(new Set(scene.children.map(child => child.userData.speciesId))).toEqual(new Set(['guardian', 'grazer', 'stalker']));
    views.sync(world, .5);
    expect(scene.children.every(child => child.visible)).toBe(true);
    views.dispose();
    expect(scene.children).toHaveLength(0);
  });
});
