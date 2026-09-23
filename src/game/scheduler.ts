import type { DecisionInput, DecisionResult } from '../shared/model';

export interface DecisionScheduler {
  issue(input: DecisionInput): boolean;
  invalidate(creatureId: string, epoch: number): void;
  accept(result: DecisionResult): void;
  takeReady(creatureId: string): DecisionResult | null;
  takeError(creatureId: string): Error | null;
}

export function createDecisionScheduler(send: (input: DecisionInput) => Promise<DecisionResult>, timeoutMs = 4000): DecisionScheduler {
  const pending = new Map<string, number>();
  const deadlines = new Map<string, ReturnType<typeof setTimeout>>();
  const expected = new Map<string, number>();
  const ready = new Map<string, DecisionResult>();
  const errors = new Map<string, Error>();
  const clearPending = (creatureId: string): void => {
    pending.delete(creatureId);
    const deadline = deadlines.get(creatureId);
    if (deadline) clearTimeout(deadline);
    deadlines.delete(creatureId);
  };

  const accept = (result: DecisionResult): void => {
    const pendingEpoch = pending.get(result.creatureId);
    if (pendingEpoch === undefined) return;
    clearPending(result.creatureId);
    if (pendingEpoch !== result.epoch) {
      errors.set(result.creatureId, new Error('Jev response epoch mismatch'));
      return;
    }
    if (expected.get(result.creatureId) !== result.epoch) return;
    ready.set(result.creatureId, result);
  };

  return {
    issue(input) {
      if (pending.has(input.creatureId) || (expected.get(input.creatureId) ?? -1) > input.epoch) return false;
      pending.set(input.creatureId, input.epoch);
      expected.set(input.creatureId, input.epoch);
      ready.delete(input.creatureId);
      errors.delete(input.creatureId);
      deadlines.set(input.creatureId, setTimeout(() => {
        if (pending.get(input.creatureId) !== input.epoch) return;
        clearPending(input.creatureId);
        if (expected.get(input.creatureId) === input.epoch)
          errors.set(input.creatureId, new Error('Jev decision timed out'));
      }, timeoutMs));
      try {
        void send(input).then(accept, error => {
          if (pending.get(input.creatureId) !== input.epoch) return;
          clearPending(input.creatureId);
          if (expected.get(input.creatureId) === input.epoch) {
            errors.set(input.creatureId, error instanceof Error ? error : new Error(String(error)));
          }
        });
      } catch (error) {
        clearPending(input.creatureId);
        errors.set(input.creatureId, error instanceof Error ? error : new Error(String(error)));
      }
      return true;
    },
    invalidate(creatureId, epoch) {
      expected.set(creatureId, epoch);
      clearPending(creatureId);
      ready.delete(creatureId);
      errors.delete(creatureId);
    },
    accept,
    takeReady(creatureId) {
      const result = ready.get(creatureId) ?? null;
      ready.delete(creatureId);
      return result;
    },
    takeError(creatureId) {
      const error = errors.get(creatureId) ?? null;
      errors.delete(creatureId);
      return error;
    },
  };
}
