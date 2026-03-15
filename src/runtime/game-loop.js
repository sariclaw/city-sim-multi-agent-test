export function createGameLoop({ store, engine }) {
  let frameHandle = 0;

  function simulationFrame(timestamp) {
    const state = store.getState();

    if (!state.simulation.lastFrameMs) {
      state.simulation.lastFrameMs = timestamp;
    }

    const elapsed = timestamp - state.simulation.lastFrameMs;
    state.simulation.lastFrameMs = timestamp;

    if (!state.simulation.paused && !state.simulation.gameOver) {
      state.simulation.accumulatorMs += elapsed;
      const stepMs = engine.currentTickMs();

      while (
        state.simulation.accumulatorMs >= stepMs
        && !store.getState().simulation.gameOver
        && !store.getState().simulation.paused
      ) {
        state.simulation.accumulatorMs -= stepMs;
        engine.tickSimulation();
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
