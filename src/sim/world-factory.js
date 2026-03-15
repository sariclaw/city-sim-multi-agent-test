import {
  BUDGET_LIMITS,
  DEFAULT_OVERLAY,
  LOG_LIMIT,
  MAP_ZOOM_DEFAULT,
  POLICY_DEFINITIONS,
  RESOURCE_DEFAULTS,
  SEASONS,
  SPEED_OPTIONS,
  TAX_RATE_LIMITS,
  TICKS_PER_SEASON,
  WORLD_LAYOUT,
} from '../config/index.js';
import { tileKey } from './tile-utils.js';

function buildTerrain() {
  const cells = {};

  for (let y = 0; y < WORLD_LAYOUT.rows; y += 1) {
    for (let x = 0; x < WORLD_LAYOUT.cols; x += 1) {
      let type = 'land';
      let height = 0;
      let blocked = false;

      if (x <= 4 || (x <= 6 && y <= 8) || (x <= 5 && y >= 19)) {
        type = 'water';
      } else if ((x >= 25 && y <= 6) || (x >= 28 && y <= 10) || (y >= 24 && x >= 25)) {
        type = 'rock';
        height = 2;
        blocked = true;
      } else if (x >= 23 && y <= 10) {
        type = 'hill';
        height = 1;
        blocked = true;
      }

      cells[tileKey(x, y)] = {
        x,
        y,
        type,
        height,
        blocked,
      };
    }
  }

  return cells;
}

function buildStartingRoads() {
  const tiles = {};

  for (let x = 8; x <= 26; x += 1) {
    tiles[tileKey(x, 15)] = { kind: 'avenue', variant: 'ew', load: 0, capacity: 52 };
  }

  for (let y = 9; y <= 21; y += 1) {
    tiles[tileKey(16, y)] = { kind: 'road', variant: 'ns', load: 0, capacity: 28 };
  }

  for (let x = 5; x <= 16; x += 1) {
    tiles[tileKey(x, 16)] = { kind: x >= 8 ? 'road' : 'avenue', variant: 'ew', load: 0, capacity: x >= 8 ? 28 : 52 };
  }

  for (let y = 16; y <= 18; y += 1) {
    tiles[tileKey(11, y)] = { kind: 'road', variant: 'ns', load: 0, capacity: 28 };
    tiles[tileKey(12, y)] = { kind: 'road', variant: 'ns', load: 0, capacity: 28 };
  }

  for (let y = 18; y <= 21; y += 1) {
    tiles[tileKey(12, y)] = { kind: 'road', variant: 'ns', load: 0, capacity: 28 };
  }

  for (let x = 10; x <= 14; x += 1) {
    tiles[tileKey(x, 19)] = { kind: 'road', variant: 'ew', load: 0, capacity: 28 };
  }

  return tiles;
}

function buildStartingBuildings() {
  return {
    b1: {
      id: 'b1',
      type: 'heat-plant',
      x: 11,
      y: 18,
      status: 'online',
      residents: 0,
      jobs: 0,
      workers: 0,
      health: 1,
      connectedRoad: null,
    },
    b2: {
      id: 'b2',
      type: 'power-plant',
      x: 12,
      y: 17,
      status: 'online',
      residents: 0,
      jobs: 0,
      workers: 0,
      health: 1,
      connectedRoad: null,
    },
    b3: {
      id: 'b3',
      type: 'water-pump',
      x: 5,
      y: 16,
      status: 'online',
      residents: 0,
      jobs: 0,
      workers: 0,
      health: 1,
      connectedRoad: null,
    },
  };
}

function buildStartingZones() {
  const zones = {};

  for (let x = 18; x <= 22; x += 1) {
    zones[tileKey(x, 13)] = { type: 'residential', density: 'low', progress: 0.82 };
    zones[tileKey(x, 14)] = { type: 'residential', density: 'low', progress: 0.84 };
  }

  for (let x = 18; x <= 22; x += 1) {
    zones[tileKey(x, 16)] = { type: 'commercial', density: 'low', progress: 0.72 };
  }

  for (let x = 10; x <= 14; x += 1) {
    zones[tileKey(x, 20)] = { type: 'industrial', density: 'low', progress: 0.68 };
  }

  return zones;
}

function buildStartingLog() {
  return [
    'Legacy Stonehaven has been retired. The new charter starts with a cold river basin, a small grid, and a lot to prove.',
    'The council expects a classical city builder, but winter will not negotiate.',
  ].slice(0, LOG_LIMIT);
}

export function createInitialState() {
  return {
    meta: {
      cityName: 'New Stonehaven',
      version: '0.2.0',
      legacyMode: false,
    },
    world: {
      cols: WORLD_LAYOUT.cols,
      rows: WORLD_LAYOUT.rows,
      tiles: buildTerrain(),
      terrain: {
        cells: buildTerrain(),
      },
      zones: buildStartingZones(),
      buildings: buildStartingBuildings(),
    },
    networks: {
      roads: {
        tiles: buildStartingRoads(),
        components: {},
        coverage: {},
      },
      utilities: {
        power: { supply: 0, demand: 0, coverage: 0 },
        water: { supply: 0, demand: 0, coverage: 0 },
        serviceCoverage: { clinic: 0, fire: 0 },
      },
      heat: {
        supply: 0,
        demand: 0,
        coverage: 0,
        hotTiles: [],
      },
      traffic: {
        averageLoad: 0,
        hottestRoads: [],
      },
    },
    city: {
      population: {
        total: 28,
        housed: 28,
        workforce: 15,
        employed: 8,
        homeless: 0,
        sick: 1,
        deaths: 0,
        hope: 62,
        discontent: 22,
      },
      economy: {
        money: RESOURCE_DEFAULTS.money,
        income: 0,
        expenses: 0,
        net: 0,
        food: RESOURCE_DEFAULTS.food,
        fuel: RESOURCE_DEFAULTS.fuel,
        power: 0,
        water: 0,
        heat: 0,
        taxes: {
          residential: 9,
          commercial: 9,
          industrial: 10,
        },
        budget: {
          clinic: 100,
          fire: 100,
          heat: 100,
        },
        demand: {
          residential: 55,
          commercial: 42,
          industrial: 46,
        },
        pollution: 6,
        landValue: 48,
      },
      services: {
        clinicCoverage: 0,
        fireCoverage: 0,
        wellbeing: 58,
        safety: 46,
      },
      policies: Object.fromEntries(POLICY_DEFINITIONS.map((policy) => [policy.key, false])),
    },
    climate: {
      year: 1,
      seasonIndex: 3,
      seasonTick: 0,
      ticksPerSeason: TICKS_PER_SEASON,
      temperature: -8,
      targetTemperature: SEASONS[3].baselineTemp,
      coldWaveTicks: 0,
      coldWaveActive: false,
    },
    simulation: {
      paused: false,
      speed: SPEED_OPTIONS[0].value,
      tick: 0,
      turn: 1,
      gameOver: false,
      accumulatorMs: 0,
      lastFrameMs: 0,
      events: buildStartingLog(),
    },
    ui: {
      tool: 'road',
      overlay: DEFAULT_OVERLAY,
      selection: { kind: 'tile', key: tileKey(16, 15) },
      hoveredCell: null,
      preview: null,
      camera: { x: 0, y: 0 },
      zoom: MAP_ZOOM_DEFAULT,
      pointerMode: 'paint',
    },
  };
}

export function mergeState(base, incoming) {
  return {
    ...base,
    ...incoming,
    meta: {
      ...base.meta,
      ...(incoming.meta ?? {}),
    },
    world: {
      ...base.world,
      ...(incoming.world ?? {}),
      terrain: {
        ...base.world.terrain,
        ...(incoming.world?.terrain ?? {}),
        cells: incoming.world?.terrain?.cells ?? base.world.terrain.cells,
      },
      tiles: incoming.world?.tiles ?? base.world.tiles,
      zones: incoming.world?.zones ?? base.world.zones,
      buildings: incoming.world?.buildings ?? base.world.buildings,
    },
    networks: {
      ...base.networks,
      ...(incoming.networks ?? {}),
      roads: {
        ...base.networks.roads,
        ...(incoming.networks?.roads ?? {}),
      },
      utilities: {
        ...base.networks.utilities,
        ...(incoming.networks?.utilities ?? {}),
      },
      heat: {
        ...base.networks.heat,
        ...(incoming.networks?.heat ?? {}),
      },
      traffic: {
        ...base.networks.traffic,
        ...(incoming.networks?.traffic ?? {}),
      },
    },
    city: {
      ...base.city,
      ...(incoming.city ?? {}),
      population: {
        ...base.city.population,
        ...(incoming.city?.population ?? {}),
      },
      economy: {
        ...base.city.economy,
        ...(incoming.city?.economy ?? {}),
        taxes: {
          ...base.city.economy.taxes,
          ...(incoming.city?.economy?.taxes ?? {}),
        },
        budget: {
          ...base.city.economy.budget,
          ...(incoming.city?.economy?.budget ?? {}),
        },
        demand: {
          ...base.city.economy.demand,
          ...(incoming.city?.economy?.demand ?? {}),
        },
      },
      services: {
        ...base.city.services,
        ...(incoming.city?.services ?? {}),
      },
      policies: {
        ...base.city.policies,
        ...(incoming.city?.policies ?? {}),
      },
    },
    climate: {
      ...base.climate,
      ...(incoming.climate ?? {}),
    },
    simulation: {
      ...base.simulation,
      ...(incoming.simulation ?? {}),
      events: Array.isArray(incoming.simulation?.events)
        ? incoming.simulation.events.slice(0, LOG_LIMIT)
        : base.simulation.events,
    },
    ui: {
      ...base.ui,
      ...(incoming.ui ?? {}),
      selection: {
        ...base.ui.selection,
        ...(incoming.ui?.selection ?? {}),
      },
      hoveredCell: incoming.ui?.hoveredCell ?? base.ui.hoveredCell,
      preview: incoming.ui?.preview ?? base.ui.preview,
      camera: {
        ...base.ui.camera,
        ...(incoming.ui?.camera ?? {}),
      },
    },
  };
}

export function clampBudget(value) {
  return Math.max(BUDGET_LIMITS.min, Math.min(BUDGET_LIMITS.max, value));
}

export function clampTax(value) {
  return Math.max(TAX_RATE_LIMITS.min, Math.min(TAX_RATE_LIMITS.max, value));
}
