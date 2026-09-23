import { describe, expect, test } from 'vitest';
import { applyMemoryEvent } from '../src/shared/memory';
import { creature } from './fixtures';

describe('individual creature memory', () => {
  test('only the creature that experienced a theft remembers the player', () => {
    const a = creature('a', 'guardian');
    const b = creature('b', 'guardian');
    const event = { id: 'e1', type: 'egg_stolen' as const, creatureId: 'a', otherId: 'player', at: 10 };
    const changed = applyMemoryEvent(a, event);
    expect(changed.memory.events).toContainEqual({ id: 'e1', type: 'egg_stolen', otherId: 'player', at: 10 });
    expect(changed.memory.disposition).toBeLessThan(0);
    expect(applyMemoryEvent(b, event)).toBe(b);
  });

  test('the same event cannot change memory twice', () => {
    const a = creature('a', 'guardian');
    const event = { id: 'e1', type: 'fed' as const, creatureId: 'a', otherId: 'player', at: 10 };
    const once = applyMemoryEvent(a, event);
    expect(applyMemoryEvent(once, event)).toBe(once);
  });

  test('feeding increases trust without changing the original creature', () => {
    const a = creature('a', 'grazer');
    const fed = applyMemoryEvent(a, { id: 'e1', type: 'fed', creatureId: 'a', otherId: 'player', at: 10 });
    expect(fed.memory.disposition).toBeGreaterThan(0);
    expect(a.memory.events).toHaveLength(0);
  });

  test('memory disposition stays bounded', () => {
    let a = creature('a', 'guardian');
    for (let i = 0; i < 20; i++) {
      a = applyMemoryEvent(a, { id: `injury-${i}`, type: 'injured', creatureId: 'a', otherId: 'player', at: i });
    }
    expect(a.memory.disposition).toBe(-1);
    expect(a.memory.events.length).toBeLessThanOrEqual(16);
  });
});
