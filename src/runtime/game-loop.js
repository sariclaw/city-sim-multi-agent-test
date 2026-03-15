export function createGameLoop({ store, engine }) {
  let frameHandle = 0;

  function simulationFrame(timestamp) {
    const state = store.getState();

    if (!state.sim.lastFrameMs) {
      state.sim.lastFrameMs = timestamp;
    }

    const elapsed = timestamp - state.sim.lastFrameMs;
    state.sim.lastFrameMs = timestamp;

    if (!state.sim.paused && !state.gameOver) {
      state.sim.accumulatorMs += elapsed;
      const stepMs = engine.currentTickMs();

      while (state.sim.accumulatorMs >= stepMs && !store.getState().gameOver && !store.getState().sim.paused) {
        state.sim.accumulatorMs -= stepMs;
        engine.tickCity();
      }
    }

    frameHandle = window.requestAnimationFrame(simulationFrame);
  }

  return {
    start() {
      if (frameHandle) return frameHandle;
      frameHandle = window.requestAnimationFrame(simulationFrame);
      return frameHandle;
    },
    stop() {
      if (!frameHandle) return;
      window.cancelAnimationFrame(frameHandle);
      frameHandle = 0;
    },
  };
}
