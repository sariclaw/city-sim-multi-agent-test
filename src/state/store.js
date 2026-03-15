import {
  ACTION_LIMIT,
  ASSET_DEFINITIONS,
  DISTRICT_DEFINITIONS,
  LOG_LIMIT,
  MAP_ZOOM_DEFAULT,
  SPEED_OPTIONS,
  TICKS_PER_SEASON,
} from '../config/index.js';

function buildInitialDistricts() {
  return DISTRICT_DEFINITIONS.map((district) => ({
    ...district,
    development:
      district.type === 'civic' ? 0.8
      : district.type === 'industrial' ? 0.72
      : district.type === 'residential' ? 0.76
      : district.type === 'utility' ? 0.74
      : district.type === 'park' ? 0.7
      : 0.68,
    condition: district.type === 'industrial' ? 0.66 : 0.78,
    residents: 0,
    jobsFilled: 0,
    localUnrest: 0,
    growthTrend: 0,
    status: 'Initializing',
    metrics: {},
  }));
}

function buildInitialAssets() {
  return ASSET_DEFINITIONS.map((asset) => ({
    ...asset,
    level: asset.key === 'harbor-grid' || asset.key === 'north-terraces' ? 2 : 1,
  }));
}

export function createInitialState() {
  return {
    cityName: 'Stonehaven',
    year: 1,
    seasonIndex: 0,
    turn: 1,
    actionsLeft: ACTION_LIMIT,
    gameOver: false,
    sim: {
      paused: false,
      speed: SPEED_OPTIONS[0].value,
      tick: 0,
      seasonTick: 0,
      seasonProgress: 0,
      accumulatorMs: 0,
      lastFrameMs: 0,
      seasonLength: TICKS_PER_SEASON,
    },
    ui: {
      selection: { kind: 'district', key: 'civic' },
      hoveredTarget: null,
      camera: { x: 0, y: 0 },
      zoom: MAP_ZOOM_DEFAULT,
    },
    city: {
      resources: {
        population: 168,
        treasury: 120,
        food: 112,
        unrest: 18,
      },
      districts: buildInitialDistricts(),
      assets: buildInitialAssets(),
      systems: {},
      alerts: {
        utilityStrain: false,
        housingShortage: false,
        congestion: false,
        declinePressure: false,
        growthPressure: false,
      },
    },
    log: [
      'Stonehaven runs on its own now: districts grow, strain, and recover even without direct intervention.',
    ],
  };
}

export function mergeState(base, incoming) {
  return {
    ...base,
    ...incoming,
    sim: {
      ...base.sim,
      ...(incoming.sim ?? {}),
    },
    ui: {
      ...base.ui,
      ...(incoming.ui ?? {}),
      selection: {
        ...base.ui.selection,
        ...(incoming.ui?.selection ?? {}),
      },
      hoveredTarget: incoming.ui?.hoveredTarget ?? base.ui.hoveredTarget,
      camera: {
        ...(base.ui.camera ?? { x: 0, y: 0 }),
        ...(incoming.ui?.camera ?? {}),
      },
      zoom: incoming.ui?.zoom ?? base.ui.zoom ?? MAP_ZOOM_DEFAULT,
    },
    city: {
      ...base.city,
      ...(incoming.city ?? {}),
      resources: {
        ...base.city.resources,
        ...(incoming.city?.resources ?? {}),
      },
      districts: Array.isArray(incoming.city?.districts) ? incoming.city.districts : base.city.districts,
      assets: Array.isArray(incoming.city?.assets) ? incoming.city.assets : base.city.assets,
      systems: {
        ...base.city.systems,
        ...(incoming.city?.systems ?? {}),
      },
      alerts: {
        ...base.city.alerts,
        ...(incoming.city?.alerts ?? {}),
      },
    },
    log: Array.isArray(incoming.log) ? incoming.log.slice(0, LOG_LIMIT) : base.log,
  };
}

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
      const nextState = mutator(state);
      if (nextState !== undefined) {
        state = nextState;
      }
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
