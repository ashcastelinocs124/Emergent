import type { DecisionInput, DecisionResult } from '../shared/model';

export interface DecisionScheduler {
  issue(input: DecisionInput): boolean;
  invalidate(creatureId: string, epoch: number): void;
  accept(result: DecisionResult): void;
  takeReady(creatureId: string): DecisionResult | null;
  takeError(creatureId: string): Error | null;
}

export function createDecisionScheduler(send: (input: DecisionInput) => Promise<DecisionResult>, timeoutMs = 4000): DecisionScheduler {
  const pending = new Map<string, { epoch: number }>();
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
    const request = pending.get(result.creatureId);
    if (!request || request.epoch !== result.epoch) return;
    clearPending(result.creatureId);
    if (expected.get(result.creatureId) !== result.epoch) return;
    ready.set(result.creatureId, result);
  };

  return {
    issue(input) {
      if (pending.has(input.creatureId) || (expected.get(input.creatureId) ?? -1) > input.epoch) return false;
      const request = { epoch: input.epoch };
      pending.set(input.creatureId, request);
      expected.set(input.creatureId, input.epoch);
      ready.delete(input.creatureId);
      errors.delete(input.creatureId);
      deadlines.set(input.creatureId, setTimeout(() => {
        if (pending.get(input.creatureId) !== request) return;
        clearPending(input.creatureId);
        if (expected.get(input.creatureId) === input.epoch)
          errors.set(input.creatureId, new Error('Jev decision timed out'));
      }, timeoutMs));
      try {
        void send(input).then(result => {
          if (pending.get(input.creatureId) !== request) return;
          if (result.epoch !== request.epoch || result.creatureId !== input.creatureId) {
            clearPending(input.creatureId);
            errors.set(input.creatureId, new Error('Jev response identity mismatch'));
            return;
          }
          accept(result);
        }, error => {
          if (pending.get(input.creatureId) !== request) return;
          clearPending(input.creatureId);
          if (expected.get(input.creatureId) === input.epoch) {
            errors.set(input.creatureId, error instanceof Error ? error : new Error(String(error)));
          }
        });
      } catch (error) {
        if (pending.get(input.creatureId) === request) {
          clearPending(input.creatureId);
          errors.set(input.creatureId, error instanceof Error ? error : new Error(String(error)));
        }
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
