import { createMapRenderer } from './render/map-renderer.js';
import { createGameLoop } from './runtime/game-loop.js';
import { createEngine } from './sim/engine.js';
import { createStore } from './state/store.js';
import { createAppController } from './ui/app-controller.js';
import { createAppView } from './ui/app-view.js';

const app = document.querySelector('#app');

const store = createStore();
const engine = createEngine(store);
const renderer = createMapRenderer({ store, engine });
const view = createAppView({ app, store, engine });
const controller = createAppController({ app, store, engine, renderer });
const gameLoop = createGameLoop({ store, engine });

function renderApp() {
  view.render();
  controller.bindCanvas();
  renderer.syncCameraToCanvas();
  renderer.paint();
}

store.subscribe((_state, reason) => {
  if (reason === 'canvas-hover' || reason === 'camera') {
    controller.bindCanvas();
    renderer.paint();
    return;
  }

  renderApp();
});

window.citySimState = {
  getSnapshot() {
    return store.getSnapshot();
  },
};

window.citySimUI = {
  getState() {
    return store.getSnapshot();
  },
  setState(nextState) {
    engine.applyExternalState(nextState);
  },
  render() {
    renderApp();
  },
  pause() {
    engine.togglePause(true);
  },
  resume() {
    engine.togglePause(false);
  },
  setSpeed: engine.setSpeed,
  selectDistrict: engine.selectDistrict,
  selectAsset: engine.selectAsset,
};

engine.initialize();
renderApp();
gameLoop.start();
