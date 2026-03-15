import { createInitialState, mergeState } from '../sim/world-factory.js';

export { createInitialState, mergeState };

export function createStore() {
  let state = createInitialState();
  const listeners = new Set();

  function notify(reason = 'state') {
    listeners.forEach((listener) => listener(state, reason));
  }

  return {
    getState() {
      return state;
    },
    getSnapshot() {
      return structuredClone(state);
    },
    setState(nextState, { notify: shouldNotify = true, reason = 'state' } = {}) {
      state = nextState;
      if (shouldNotify) notify(reason);
      return state;
    },
    update(mutator, { notify: shouldNotify = true, reason = 'state' } = {}) {
      const maybeNextState = mutator(state);
      if (maybeNextState !== undefined) state = maybeNextState;
      if (shouldNotify) notify(reason);
      return state;
    },
    merge(nextState, { notify: shouldNotify = true, reason = 'state' } = {}) {
      state = mergeState(state, nextState);
      if (shouldNotify) notify(reason);
      return state;
    },
    reset({ notify: shouldNotify = true, reason = 'reset' } = {}) {
      state = createInitialState();
      if (shouldNotify) notify(reason);
      return state;
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
    notify,
  };
}
