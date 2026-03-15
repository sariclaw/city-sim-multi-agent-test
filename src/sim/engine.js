import {
  MAP_ZOOM_DEFAULT,
  MAP_ZOOM_MAX,
  MAP_ZOOM_MIN,
  SPEED_OPTIONS,
} from '../config/index.js';
import { mergeState } from '../state/store.js';
import {
  beginPlacementPreviewCommand,
  cancelPlacementPreviewCommand,
  commitPlacementCommand,
  selectEntityAtCommand,
  selectToolCommand,
  setBudgetCommand,
  setOverlayModeCommand,
  setTaxRateCommand,
  togglePolicyCommand,
  updateCursorCellCommand,
  updatePlacementPreviewCommand,
} from './commands.js';
import { currentSeason, selectedEntity, toolDefinition } from './selectors.js';
import { clamp } from './tile-utils.js';
import { createInitialState } from './world-factory.js';
import { recomputeSimulationState, tickSimulationState } from './systems/index.js';

export function createEngine(store) {
  function getState() {
    return store.getState();
  }

  function notify(reason = 'app') {
    store.notify(reason);
  }

  function currentSpeedOption() {
    return SPEED_OPTIONS.find((option) => option.value === getState().simulation.speed) ?? SPEED_OPTIONS[0];
  }

  function currentTickMs() {
    return currentSpeedOption().tickMs;
  }

  function refresh(reason = 'app') {
    recomputeSimulationState(getState());
    notify(reason);
  }

  function initialize() {
    recomputeSimulationState(getState());
  }

  function tickSimulation() {
    const state = getState();
    if (state.simulation.gameOver) return false;
    tickSimulationState(state);
    notify('app');
    return true;
  }

  function pause() {
    getState().simulation.paused = true;
    getState().simulation.lastFrameMs = 0;
    notify('app');
  }

  function resume() {
    getState().simulation.paused = false;
    getState().simulation.lastFrameMs = 0;
    notify('app');
  }

  function togglePause(forceValue) {
    if (typeof forceValue === 'boolean') {
      if (forceValue) pause();
      else resume();
      return;
    }

    if (getState().simulation.paused) resume();
    else pause();
  }

  function setSpeed(speed) {
    if (!SPEED_OPTIONS.some((option) => option.value === speed)) return false;
    getState().simulation.speed = speed;
    getState().simulation.accumulatorMs = 0;
    getState().simulation.lastFrameMs = 0;
    notify('app');
    return true;
  }

  function selectTool(toolKey) {
    const changed = selectToolCommand(getState(), toolKey);
    if (changed) notify('selection');
    return changed;
  }

  function updateCursorCell(cell, { notifyReason = 'canvas-hover' } = {}) {
    updateCursorCellCommand(getState(), cell);
    notify(notifyReason);
  }

  function beginPlacementPreview(cell) {
    const started = beginPlacementPreviewCommand(getState(), cell);
    if (started) {
      updatePlacementPreviewCommand(getState(), cell);
      notify('preview');
    }
    return started;
  }

  function updatePlacementPreview(cell) {
    const updated = updatePlacementPreviewCommand(getState(), cell);
    if (updated) notify('preview');
    return updated;
  }

  function cancelPlacementPreview() {
    cancelPlacementPreviewCommand(getState());
    notify('preview');
  }

  function commitPlacement() {
    const committed = commitPlacementCommand(getState());
    if (!committed) {
      notify('preview');
      return false;
    }
    refresh('app');
    return true;
  }

  function selectAt(key) {
    const entity = selectEntityAtCommand(getState(), key);
    notify('selection');
    return entity;
  }

  function setOverlayMode(overlayKey) {
    setOverlayModeCommand(getState(), overlayKey);
    notify('overlay');
  }

  function setBudget(kind, value) {
    const changed = setBudgetCommand(getState(), kind, value);
    if (changed) refresh('app');
    return changed;
  }

  function setTaxRate(kind, value) {
    const changed = setTaxRateCommand(getState(), kind, value);
    if (changed) refresh('app');
    return changed;
  }

  function togglePolicy(policyKey) {
    const next = togglePolicyCommand(getState(), policyKey);
    if (next !== false) refresh('app');
    return next;
  }

  function setCamera(camera) {
    getState().ui.camera = {
      x: Number(camera?.x ?? 0),
      y: Number(camera?.y ?? 0),
    };
    notify('camera');
  }

  function setZoom(zoom) {
    getState().ui.zoom = clamp(zoom, MAP_ZOOM_MIN, MAP_ZOOM_MAX);
    notify('camera');
  }

  function applyExternalState(nextState) {
    store.setState(mergeState(getState(), nextState), { notify: false });
    refresh('app');
  }

  function resetGame() {
    store.setState(createInitialState(), { notify: false });
    initialize();
    notify('reset');
  }

  return {
    applyExternalState,
    beginPlacementPreview,
    cancelPlacementPreview,
    commitPlacement,
    currentSeason: () => currentSeason(getState()),
    currentSpeedOption,
    currentTickMs,
    getState,
    initialize,
    pause,
    refresh,
    resetGame,
    resume,
    selectAt,
    selectedEntity: () => selectedEntity(getState()),
    selectTool,
    setBudget,
    setCamera,
    setOverlayMode,
    setSpeed,
    setTaxRate,
    setZoom,
    tickSimulation,
    togglePause,
    togglePolicy,
    toolDefinition,
    updateCursorCell,
    updatePlacementPreview,
  };
}
