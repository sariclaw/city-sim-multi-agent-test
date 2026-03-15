const app = document.querySelector('#app');

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const ACTION_LIMIT = 2;
const LOG_LIMIT = 10;
const TICKS_PER_SEASON = 6;
const SPEED_OPTIONS = [
  { label: '1x', value: 1, tickMs: 1000 },
  { label: '2x', value: 2, tickMs: 550 },
  { label: '4x', value: 4, tickMs: 280 },
];

const DISTRICT_LAYOUT = [
  { key: 'civic', label: 'Civic Core', type: 'civic', x: 0.355, y: 0.145, w: 0.29, h: 0.22 },
  { key: 'north', label: 'North Steps', type: 'residential', x: 0.645, y: 0.09, w: 0.225, h: 0.25 },
  { key: 'harbor', label: 'Rivergate', type: 'utility', x: 0.105, y: 0.16, w: 0.21, h: 0.27 },
  { key: 'market', label: 'Market Spine', type: 'commercial', x: 0.34, y: 0.395, w: 0.325, h: 0.2 },
  { key: 'park', label: 'Green Loop', type: 'park', x: 0.105, y: 0.505, w: 0.225, h: 0.25 },
  { key: 'industry', label: 'Ironworks', type: 'industrial', x: 0.675, y: 0.445, w: 0.2, h: 0.245 },
  { key: 'south', label: 'South Reach', type: 'mixed', x: 0.355, y: 0.66, w: 0.295, h: 0.19 },
];

const DISTRICT_MODELS = {
  civic: {
    housing: 8,
    jobs: 24,
    serviceSupply: 30,
    transitSupply: 22,
    revenueBase: 7,
    upkeep: 8,
    appeal: 0.62,
    stability: 18,
  },
  residential: {
    housing: 74,
    jobs: 12,
    serviceNeed: 18,
    transitDemand: 14,
    upkeep: 4,
    appeal: 0.72,
    stability: 8,
  },
  utility: {
    jobs: 18,
    powerSupply: 36,
    waterSupply: 38,
    serviceSupply: 4,
    transitSupply: 12,
    upkeep: 7,
    appeal: 0.38,
    stability: 10,
  },
  commercial: {
    housing: 8,
    jobs: 40,
    revenueBase: 20,
    transitSupply: 16,
    serviceNeed: 10,
    upkeep: 6,
    appeal: 0.56,
    stability: 4,
  },
  industrial: {
    jobs: 46,
    production: 32,
    revenueBase: 15,
    powerDemand: 20,
    waterDemand: 12,
    transitDemand: 22,
    upkeep: 9,
    appeal: 0.28,
    stability: -8,
  },
  park: {
    housing: 4,
    jobs: 10,
    food: 28,
    waterSupply: 6,
    serviceSupply: 20,
    upkeep: 3,
    appeal: 0.78,
    stability: 12,
  },
  mixed: {
    housing: 42,
    jobs: 28,
    revenueBase: 12,
    transitSupply: 12,
    transitDemand: 14,
    serviceNeed: 14,
    upkeep: 5,
    appeal: 0.65,
    stability: 6,
  },
};

const ASSET_DEFINITIONS = [
  {
    key: 'civic-hall',
    districtKey: 'civic',
    label: 'Council Hall',
    maxLevel: 4,
    effects: { serviceSupply: 12, stability: 8, transitSupply: 6, upkeep: 2 },
  },
  {
    key: 'north-terraces',
    districtKey: 'north',
    label: 'Terrace Housing',
    maxLevel: 4,
    effects: { housing: 22, appeal: 0.08, serviceNeed: 4, transitDemand: 4, upkeep: 1 },
  },
  {
    key: 'harbor-grid',
    districtKey: 'harbor',
    label: 'Tidal Grid',
    maxLevel: 4,
    effects: { powerSupply: 30, waterSupply: 18, jobs: 4, upkeep: 3 },
  },
  {
    key: 'market-exchange',
    districtKey: 'market',
    label: 'Trade Exchange',
    maxLevel: 4,
    effects: { jobs: 12, revenueBase: 14, transitSupply: 8, upkeep: 2 },
  },
  {
    key: 'park-greenhouses',
    districtKey: 'park',
    label: 'Greenhouses',
    maxLevel: 4,
    effects: { food: 18, serviceSupply: 6, waterSupply: 4, appeal: 0.05, upkeep: 1 },
  },
  {
    key: 'industry-foundry',
    districtKey: 'industry',
    label: 'Foundry Line',
    maxLevel: 4,
    effects: { jobs: 16, production: 18, revenueBase: 10, powerDemand: 12, pollution: 12, upkeep: 3 },
  },
  {
    key: 'south-crossings',
    districtKey: 'south',
    label: 'Mixed-Use Blocks',
    maxLevel: 4,
    effects: { housing: 18, jobs: 10, transitSupply: 10, appeal: 0.05, upkeep: 2 },
  },
];

const actions = [
  {
    key: 'housing',
    label: 'Expand Housing',
    note: 'Upgrades the district under the strongest housing pressure.',
  },
  {
    key: 'grid',
    label: 'Harden Grid',
    note: 'Boosts utility output at Rivergate to relieve power and water strain.',
  },
  {
    key: 'industry',
    label: 'Back Industry',
    note: 'Raises production and jobs, but increases load and unrest risk.',
  },
  {
    key: 'services',
    label: 'Fund Services',
    note: 'Strengthens civic services to calm unrest and support growth.',
  },
];

const OPEN_ASSET_FILES = {
  city: 'assets/open/pixel-city/pixel city_0.png',
  municipal: 'assets/open/municipal-buildings/municipal buildings_0.png',
  brick: 'assets/open/brick-apartments/brick_buildings.PNG',
  brickLarge: 'assets/open/brick-apartments/brick_lg.PNG',
  roadsA: 'assets/open/streets-and-avenues/spr_roads_1_strip15_1.png',
  roadsB: 'assets/open/streets-and-avenues/spr_road_2_strip29_2.png',
};

const ROAD_SEGMENTS = [
  { x1: 0.2, y1: 0.18, x2: 0.2, y2: 0.86, avenue: false },
  { x1: 0.38, y1: 0.14, x2: 0.38, y2: 0.88, avenue: true },
  { x1: 0.62, y1: 0.12, x2: 0.62, y2: 0.9, avenue: true },
  { x1: 0.82, y1: 0.16, x2: 0.82, y2: 0.86, avenue: false },
  { x1: 0.08, y1: 0.34, x2: 0.92, y2: 0.34, avenue: false },
  { x1: 0.1, y1: 0.56, x2: 0.9, y2: 0.56, avenue: true },
  { x1: 0.12, y1: 0.77, x2: 0.88, y2: 0.77, avenue: false },
];

const ROAD_TILE_SIZE = 32;
const ROAD_TILE_LIBRARY = {
  diagonal: { sheet: 'roadsA', index: 5 },
  reverse: { sheet: 'roadsA', index: 6 },
  hub: { sheet: 'roadsA', index: 19 },
  edge: { sheet: 'roadsA', index: 20 },
  avenueA: { sheet: 'roadsB', index: 34 },
  avenueB: { sheet: 'roadsB', index: 35 },
  capA: { sheet: 'roadsB', index: 40 },
  capB: { sheet: 'roadsB', index: 41 },
};

const DISTRICT_SPRITES = {
  civic: [
    { sheet: 'municipal', region: [0.04, 0.04, 0.44, 0.9], anchor: [0.08, 0.3, 0.42, 0.56] },
    { sheet: 'municipal', region: [0.5, 0.08, 0.44, 0.8], anchor: [0.54, 0.36, 0.28, 0.42] },
  ],
  residential: [
    { sheet: 'brickLarge', region: [0.04, 0.06, 0.42, 0.88], anchor: [0.05, 0.24, 0.38, 0.62] },
    { sheet: 'brick', region: [0.5, 0.08, 0.42, 0.84], anchor: [0.46, 0.3, 0.28, 0.5] },
    { sheet: 'brick', region: [0.08, 0.1, 0.32, 0.76], anchor: [0.73, 0.36, 0.18, 0.38] },
  ],
  utility: [
    { sheet: 'municipal', region: [0.52, 0.06, 0.42, 0.84], anchor: [0.1, 0.28, 0.3, 0.54] },
    { sheet: 'city', region: [0.04, 0.54, 0.42, 0.34], anchor: [0.45, 0.38, 0.36, 0.32] },
  ],
  commercial: [
    { sheet: 'city', region: [0.06, 0.06, 0.4, 0.34], anchor: [0.06, 0.28, 0.34, 0.44] },
    { sheet: 'city', region: [0.48, 0.06, 0.38, 0.34], anchor: [0.42, 0.2, 0.28, 0.52] },
    { sheet: 'city', region: [0.24, 0.46, 0.26, 0.3], anchor: [0.72, 0.4, 0.16, 0.3] },
  ],
  industrial: [
    { sheet: 'city', region: [0.04, 0.52, 0.4, 0.34], anchor: [0.08, 0.38, 0.34, 0.34] },
    { sheet: 'city', region: [0.5, 0.52, 0.36, 0.34], anchor: [0.44, 0.3, 0.3, 0.38] },
    { sheet: 'roadsB', region: [0.42, 0.66, 0.26, 0.18], anchor: [0.74, 0.56, 0.16, 0.18] },
  ],
  park: [
    { sheet: 'municipal', region: [0.08, 0.18, 0.22, 0.24], anchor: [0.38, 0.36, 0.18, 0.18] },
  ],
  mixed: [
    { sheet: 'brick', region: [0.08, 0.1, 0.34, 0.76], anchor: [0.08, 0.28, 0.26, 0.48] },
    { sheet: 'city', region: [0.48, 0.08, 0.34, 0.32], anchor: [0.4, 0.22, 0.3, 0.5] },
    { sheet: 'brick', region: [0.54, 0.18, 0.26, 0.52], anchor: [0.74, 0.4, 0.15, 0.28] },
  ],
};

const DISTRICT_TYPE_LABELS = {
  civic: 'CIVIC',
  residential: 'RES',
  utility: 'SERVICES',
  commercial: 'MIXED JOBS',
  industrial: 'INDUSTRY',
  park: 'OPEN SPACE',
  mixed: 'URBAN MIX',
};

const ASSET_ICON_SPRITES = {
  'civic-hall': { sheet: 'municipal', region: [0.06, 0.06, 0.34, 0.52] },
  'north-terraces': { sheet: 'brick', region: [0.5, 0.08, 0.34, 0.64] },
  'harbor-grid': { sheet: 'roadsB', region: [0.4, 0.5, 0.2, 0.2] },
  'market-exchange': { sheet: 'city', region: [0.5, 0.06, 0.24, 0.22] },
  'park-greenhouses': { sheet: 'municipal', region: [0.36, 0.1, 0.18, 0.22] },
  'industry-foundry': { sheet: 'city', region: [0.52, 0.52, 0.26, 0.28] },
  'south-crossings': { sheet: 'brickLarge', region: [0.06, 0.1, 0.28, 0.68] },
};

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function roundNumber(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

function currentSeason() {
  return SEASONS[state.seasonIndex];
}

function nextSeason() {
  return SEASONS[(state.seasonIndex + 1) % SEASONS.length];
}

function currentSpeedOption() {
  return SPEED_OPTIONS.find((option) => option.value === state.sim.speed) ?? SPEED_OPTIONS[0];
}

function currentTickMs() {
  return currentSpeedOption().tickMs;
}

function seasonProfile(season) {
  switch (season) {
    case 'Spring':
      return { food: 1.08, growth: 0.45, utility: 1, upkeep: 1, mood: 4 };
    case 'Summer':
      return { food: 1.18, growth: 0.22, utility: 0.98, upkeep: 0.98, mood: 1 };
    case 'Autumn':
      return { food: 1.26, growth: 0.08, utility: 1, upkeep: 1.02, mood: 0 };
    case 'Winter':
      return { food: 0.6, growth: -0.38, utility: 1.15, upkeep: 1.12, mood: -8 };
    default:
      return { food: 1, growth: 0, utility: 1, upkeep: 1, mood: 0 };
  }
}

function toneFromRatio(value, good = 1.04, warn = 0.92) {
  if (value >= good) return 'good';
  if (value >= warn) return 'warn';
  return 'danger';
}

function toneFromPercent(value, highGood = 65, lowWarn = 42) {
  if (value >= highGood) return 'good';
  if (value >= lowWarn) return 'warn';
  return 'danger';
}

function logEvent(message) {
  state.log.unshift(`${currentSeason()} Y${state.year}: ${message}`);
  state.log = state.log.slice(0, LOG_LIMIT);
}

function buildInitialDistricts() {
  return DISTRICT_LAYOUT.map((district) => ({
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

function createInitialState() {
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

let state = createInitialState();
let interactiveTargets = [];
let resizeQueued = false;
let frameHandle = 0;
let spriteLoadPromise = null;
const spriteLibrary = {
  ready: false,
  failed: false,
  images: {},
};

function mergeState(base, incoming) {
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

function getDistrictByKey(key) {
  return state.city.districts.find((district) => district.key === key);
}

function getAssetByKey(key) {
  return state.city.assets.find((asset) => asset.key === key);
}

function selectDistrict(key) {
  if (!getDistrictByKey(key)) return;
  state.ui.selection = { kind: 'district', key };
  render();
}

function selectAsset(key) {
  if (!getAssetByKey(key)) return;
  state.ui.selection = { kind: 'asset', key };
  render();
}

function resolveAssetEffects(asset) {
  return Object.fromEntries(
    Object.entries(asset.effects).map(([key, value]) => [key, value * asset.level]),
  );
}

function assetEffectsForDistrict(districtKey) {
  return state.city.assets
    .filter((asset) => asset.districtKey === districtKey)
    .map(resolveAssetEffects)
    .reduce((totals, effects) => {
      Object.entries(effects).forEach(([key, value]) => {
        totals[key] = (totals[key] ?? 0) + value;
      });
      return totals;
    }, {});
}

function capacityFromDistrict(district, season) {
  const base = DISTRICT_MODELS[district.type];
  const assetEffects = assetEffectsForDistrict(district.key);
  const developmentFactor = 0.64 + district.development * 0.76;
  const conditionFactor = 0.68 + district.condition * 0.52;
  const outputFactor = developmentFactor * conditionFactor;
  const utilityFactor = conditionFactor * season.utility;

  return {
    housing: Math.max(0, ((base.housing ?? 0) + (assetEffects.housing ?? 0)) * developmentFactor),
    jobs: Math.max(0, ((base.jobs ?? 0) + (assetEffects.jobs ?? 0)) * outputFactor),
    food: Math.max(0, ((base.food ?? 0) + (assetEffects.food ?? 0)) * outputFactor * season.food),
    powerSupply: Math.max(0, ((base.powerSupply ?? 0) + (assetEffects.powerSupply ?? 0)) * utilityFactor),
    waterSupply: Math.max(0, ((base.waterSupply ?? 0) + (assetEffects.waterSupply ?? 0)) * utilityFactor),
    serviceSupply: Math.max(0, ((base.serviceSupply ?? 0) + (assetEffects.serviceSupply ?? 0)) * outputFactor),
    transitSupply: Math.max(0, ((base.transitSupply ?? 0) + (assetEffects.transitSupply ?? 0)) * outputFactor),
    production: Math.max(0, ((base.production ?? 0) + (assetEffects.production ?? 0)) * outputFactor),
    revenueBase: Math.max(0, ((base.revenueBase ?? 0) + (assetEffects.revenueBase ?? 0)) * outputFactor),
    powerDemandBase: Math.max(0, ((base.powerDemand ?? 0) + (assetEffects.powerDemand ?? 0)) * outputFactor),
    waterDemandBase: Math.max(0, ((base.waterDemand ?? 0) + (assetEffects.waterDemand ?? 0)) * outputFactor),
    serviceNeedBase: Math.max(0, ((base.serviceNeed ?? 0) + (assetEffects.serviceNeed ?? 0)) * developmentFactor),
    transitDemandBase: Math.max(0, ((base.transitDemand ?? 0) + (assetEffects.transitDemand ?? 0)) * developmentFactor),
    upkeep: Math.max(0, ((base.upkeep ?? 0) + (assetEffects.upkeep ?? 0)) * season.upkeep * (0.82 + district.development * 0.4)),
    appeal: (base.appeal ?? 0) + (assetEffects.appeal ?? 0) + district.condition * 0.12 + district.development * 0.08,
    stability: (base.stability ?? 0) + (assetEffects.stability ?? 0) - (assetEffects.pollution ?? 0) * 0.28,
    pollution: assetEffects.pollution ?? 0,
  };
}

function calculateSnapshot() {
  const season = seasonProfile(currentSeason());
  const population = state.city.resources.population;
  const laborPool = population * 0.58;
  const districtCaps = state.city.districts.map((district) => ({
    district,
    capacities: capacityFromDistrict(district, season),
  }));

  const housingWeights = districtCaps.reduce((sum, entry) => {
    if (entry.capacities.housing <= 0) return sum;
    return sum + entry.capacities.housing * Math.max(0.35, entry.capacities.appeal);
  }, 0);

  districtCaps.forEach((entry) => {
    const weight = entry.capacities.housing > 0
      ? (entry.capacities.housing * Math.max(0.35, entry.capacities.appeal)) / Math.max(housingWeights, 1)
      : 0;
    entry.residents = Math.min(entry.capacities.housing, population * weight);
  });

  const jobsCapacity = districtCaps.reduce((sum, entry) => sum + entry.capacities.jobs, 0);
  const laborDemand = Math.min(laborPool, jobsCapacity);
  const jobWeights = districtCaps.reduce((sum, entry) => {
    if (entry.capacities.jobs <= 0) return sum;
    return sum + entry.capacities.jobs * Math.max(0.25, 0.45 + entry.capacities.appeal);
  }, 0);

  districtCaps.forEach((entry) => {
    const weight = entry.capacities.jobs > 0
      ? (entry.capacities.jobs * Math.max(0.25, 0.45 + entry.capacities.appeal)) / Math.max(jobWeights, 1)
      : 0;
    entry.jobsFilled = Math.min(entry.capacities.jobs, laborDemand * weight);
  });

  const totals = districtCaps.reduce((sum, entry) => {
    sum.housing += entry.capacities.housing;
    sum.jobs += entry.capacities.jobs;
    sum.foodProduction += entry.capacities.food;
    sum.powerSupply += entry.capacities.powerSupply;
    sum.waterSupply += entry.capacities.waterSupply;
    sum.serviceSupply += entry.capacities.serviceSupply;
    sum.transitSupply += entry.capacities.transitSupply;
    sum.production += entry.capacities.production;
    sum.revenueBase += entry.capacities.revenueBase;
    sum.upkeep += entry.capacities.upkeep;
    sum.powerDemandBase += entry.capacities.powerDemandBase;
    sum.waterDemandBase += entry.capacities.waterDemandBase;
    sum.serviceNeedBase += entry.capacities.serviceNeedBase;
    sum.transitDemandBase += entry.capacities.transitDemandBase;
    sum.pollution += entry.capacities.pollution;
    return sum;
  }, {
    housing: 0,
    jobs: 0,
    foodProduction: 0,
    powerSupply: 0,
    waterSupply: 0,
    serviceSupply: 0,
    transitSupply: 0,
    production: 0,
    revenueBase: 0,
    upkeep: 0,
    powerDemandBase: 0,
    waterDemandBase: 0,
    serviceNeedBase: 0,
    transitDemandBase: 0,
    pollution: 0,
  });

  const housingShortage = Math.max(0, population - totals.housing);
  const employed = districtCaps.reduce((sum, entry) => sum + entry.jobsFilled, 0);
  const employmentRate = laborPool > 0 ? employed / laborPool : 1;
  const powerDemand = population * 0.22 + employed * 0.07 + totals.powerDemandBase;
  const waterDemand = population * 0.2 + employed * 0.05 + totals.waterDemandBase;
  const serviceNeed = population * 0.19 + totals.serviceNeedBase + state.city.resources.unrest * 0.18;
  const transitDemand = population * 0.15 + employed * 0.1 + totals.transitDemandBase;
  const powerCoverage = totals.powerSupply / Math.max(powerDemand, 1);
  const waterCoverage = totals.waterSupply / Math.max(waterDemand, 1);
  const utilityCoverage = Math.min(powerCoverage, waterCoverage);
  const serviceCoverage = totals.serviceSupply / Math.max(serviceNeed, 1);
  const congestionRatio = transitDemand / Math.max(totals.transitSupply, 1);
  const foodDemand = population * 0.18;
  const foodBufferRatio = state.city.resources.food / Math.max(foodDemand * 5, 1);
  const utilityPenalty = Math.max(0, 1 - utilityCoverage) * 38;
  const servicePenalty = Math.max(0, 1 - serviceCoverage) * 26;
  const housingPenalty = housingShortage * 1.5;
  const jobsPenalty = Math.max(0, 1 - employmentRate) * 16;
  const congestionPenalty = Math.max(0, congestionRatio - 1) * 24;
  const debtPenalty = state.city.resources.treasury < 0 ? Math.abs(state.city.resources.treasury) / 5 : 0;
  const foodPenalty = foodBufferRatio < 0.45 ? (0.45 - foodBufferRatio) * 42 : 0;
  const satisfaction = clamp(
    84
      + season.mood
      - utilityPenalty
      - servicePenalty
      - housingPenalty
      - jobsPenalty
      - congestionPenalty
      - debtPenalty
      - foodPenalty
      - totals.pollution * 0.22,
    4,
    96,
  );
  const unrestTarget = clamp(100 - satisfaction + totals.pollution * 0.24, 6, 100);
  const efficiency = clamp(Math.min(utilityCoverage, serviceCoverage, 1.2) - Math.max(0, congestionRatio - 1) * 0.3, 0.45, 1.15);
  const production = totals.production * efficiency * lerp(0.72, 1.02, employmentRate);
  const revenue = totals.revenueBase * lerp(0.6, 1.04, employmentRate) * efficiency + production * 0.48;
  const upkeep = totals.upkeep + Math.max(0, 1 - utilityCoverage) * 8 + Math.max(0, congestionRatio - 1) * 6;
  const treasuryDelta = revenue - upkeep;
  const foodDelta = totals.foodProduction - foodDemand;
  const housingDemand = clamp(Math.round(4 + housingShortage / 5 + Math.max(0, 72 - satisfaction) / 8), 1, 10);
  const jobsDemand = clamp(Math.round(3 + Math.max(0, 1 - employmentRate) * 9), 1, 10);
  const utilitiesDemand = clamp(Math.round(3 + Math.max(0, 1 - utilityCoverage) * 11), 1, 10);
  const servicesDemand = clamp(Math.round(3 + Math.max(0, 1 - serviceCoverage) * 9 + state.city.resources.unrest / 22), 1, 10);
  const transitDemandScore = clamp(Math.round(3 + Math.max(0, congestionRatio - 1) * 10), 1, 10);
  const growthPressure = clamp(
    ((totals.housing - population) / 26) + ((satisfaction - 52) / 22) + season.growth + (employmentRate - 0.9) * 12,
    -4,
    8,
  );
  const declinePressure = clamp(
    (housingShortage / 14)
      + Math.max(0, 1 - utilityCoverage) * 5
      + Math.max(0, congestionRatio - 1) * 4
      + state.city.resources.unrest / 28
      + debtPenalty / 5,
    0,
    10,
  );

  districtCaps.forEach((entry) => {
    const housingLoad = entry.residents / Math.max(entry.capacities.housing, 1);
    const jobsLoad = entry.jobsFilled / Math.max(entry.capacities.jobs, 1);
    const localUtilityLoad = (
      (entry.residents * 0.22 + entry.jobsFilled * 0.08 + entry.capacities.powerDemandBase)
      / Math.max(entry.capacities.powerSupply + entry.capacities.waterSupply + 18, 1)
    ) * (2 - Math.min(powerCoverage, waterCoverage, 1.2));
    const localServicePressure = (
      (entry.residents * 0.2 + entry.jobsFilled * 0.08 + entry.capacities.serviceNeedBase)
      / Math.max(entry.capacities.serviceSupply + 12, 1)
    ) * (2 - Math.min(serviceCoverage, 1.15));
    const typeDemand =
      entry.district.type === 'residential' || entry.district.type === 'mixed'
        ? housingDemand / 10
        : entry.district.type === 'utility'
          ? utilitiesDemand / 10
          : entry.district.type === 'park'
            ? clamp((foodDemand - totals.foodProduction) / Math.max(foodDemand, 1) + servicesDemand / 16, 0, 1.4)
            : entry.district.type === 'civic'
              ? servicesDemand / 10
              : jobsDemand / 10;
    const localUnrest = clamp(
      state.city.resources.unrest * 0.46
        + Math.max(0, housingLoad - 0.92) * 34
        + Math.max(0, localUtilityLoad - 0.9) * 26
        + Math.max(0, localServicePressure - 1) * 24
        - entry.capacities.stability
        - entry.capacities.appeal * 12,
      2,
      100,
    );
    const growthTrend = clamp(
      typeDemand
        + (satisfaction - 50) / 50
        + (entry.capacities.appeal - 0.55)
        - Math.max(0, localUtilityLoad - 0.92) * 1.6
        - Math.max(0, localServicePressure - 1) * 1.3
        - localUnrest / 75,
      -3,
      3,
    );
    entry.localUnrest = localUnrest;
    entry.growthTrend = growthTrend;
    entry.utilityLoad = localUtilityLoad;
    entry.servicePressure = localServicePressure;
    entry.status =
      growthTrend > 1.2 ? 'Growing'
      : localUnrest > 62 ? 'Strained'
      : localUtilityLoad > 1.05 ? 'Utility strain'
      : localServicePressure > 1.02 ? 'Service pressure'
      : 'Stable';
  });

  return {
    season,
    districts: districtCaps,
    totals,
    demand: {
      housing: housingDemand,
      jobs: jobsDemand,
      utilities: utilitiesDemand,
      services: servicesDemand,
      transit: transitDemandScore,
    },
    housing: {
      capacity: totals.housing,
      shortage: housingShortage,
      pressure: housingShortage / Math.max(population, 1),
    },
    utilities: {
      power: { supply: totals.powerSupply, demand: powerDemand, coverage: powerCoverage },
      water: { supply: totals.waterSupply, demand: waterDemand, coverage: waterCoverage },
      transit: { supply: totals.transitSupply, demand: transitDemand, load: congestionRatio },
    },
    services: {
      supply: totals.serviceSupply,
      need: serviceNeed,
      coverage: serviceCoverage,
      pressure: Math.max(0, 1 - serviceCoverage),
    },
    economy: {
      jobsCapacity,
      laborPool,
      employed,
      employmentRate,
      production,
      revenue,
      upkeep,
      treasuryDelta,
    },
    food: {
      production: totals.foodProduction,
      demand: foodDemand,
      delta: foodDelta,
      reserveRatio: foodBufferRatio,
    },
    mood: {
      satisfaction,
      unrestTarget,
    },
    pressure: {
      growth: growthPressure,
      decline: declinePressure,
      utilityStrain: utilityCoverage < 0.95,
      housingShortage: housingShortage > 6,
      congestion: congestionRatio > 1.02,
      declinePressure: declinePressure > 3.7,
      growthPressure: growthPressure > 1.8,
    },
    summary: {
      activity: clamp(
        34 + state.sim.seasonProgress * 30 + production / 6 - state.city.resources.unrest / 5 + (state.sim.paused ? -14 : 10),
        12,
        98,
      ),
      alerts:
        Number(utilityCoverage < 0.95)
        + Number(housingShortage > 6)
        + Number(congestionRatio > 1.02)
        + Number(state.city.resources.unrest > 48),
    },
  };
}

function syncDistrictState(snapshot) {
  state.city.districts = state.city.districts.map((district) => {
    const next = snapshot.districts.find((entry) => entry.district.key === district.key);
    if (!next) return district;
    return {
      ...district,
      residents: next.residents,
      jobsFilled: next.jobsFilled,
      localUnrest: next.localUnrest,
      growthTrend: next.growthTrend,
      status: next.status,
      metrics: {
        housingCapacity: next.capacities.housing,
        jobsCapacity: next.capacities.jobs,
        powerSupply: next.capacities.powerSupply,
        waterSupply: next.capacities.waterSupply,
        serviceSupply: next.capacities.serviceSupply,
        production: next.capacities.production,
        revenueBase: next.capacities.revenueBase,
        utilityLoad: next.utilityLoad,
        servicePressure: next.servicePressure,
        appeal: next.capacities.appeal,
        stability: next.capacities.stability,
        pollution: next.capacities.pollution,
      },
    };
  });
}

function recomputeDerivedState() {
  const snapshot = calculateSnapshot();
  syncDistrictState(snapshot);

  state.city.systems = {
    season: currentSeason(),
    demand: snapshot.demand,
    housing: {
      ...snapshot.housing,
      pressurePercent: Math.round(snapshot.housing.pressure * 100),
    },
    utilities: {
      power: {
        ...snapshot.utilities.power,
        coveragePercent: Math.round(snapshot.utilities.power.coverage * 100),
      },
      water: {
        ...snapshot.utilities.water,
        coveragePercent: Math.round(snapshot.utilities.water.coverage * 100),
      },
      transit: {
        ...snapshot.utilities.transit,
        loadPercent: Math.round(snapshot.utilities.transit.load * 100),
      },
    },
    services: {
      ...snapshot.services,
      coveragePercent: Math.round(snapshot.services.coverage * 100),
    },
    economy: {
      ...snapshot.economy,
      employmentPercent: Math.round(snapshot.economy.employmentRate * 100),
    },
    food: snapshot.food,
    mood: {
      satisfaction: roundNumber(snapshot.mood.satisfaction),
      unrestTarget: roundNumber(snapshot.mood.unrestTarget),
    },
    pressure: snapshot.pressure,
    summary: snapshot.summary,
    overlays: [
      {
        key: 'growth',
        label: 'Growth',
        value: `${Math.round(clamp(50 + snapshot.pressure.growth * 8, 0, 100))}%`,
        tone: toneFromPercent(50 + snapshot.pressure.growth * 8),
      },
      {
        key: 'power',
        label: 'Power',
        value: `${Math.round(snapshot.utilities.power.coverage * 100)}%`,
        tone: toneFromRatio(snapshot.utilities.power.coverage),
      },
      {
        key: 'water',
        label: 'Water',
        value: `${Math.round(snapshot.utilities.water.coverage * 100)}%`,
        tone: toneFromRatio(snapshot.utilities.water.coverage),
      },
      {
        key: 'Unrest',
        label: 'Unrest',
        value: `${Math.round(state.city.resources.unrest)}%`,
        tone: state.city.resources.unrest < 28 ? 'good' : state.city.resources.unrest < 54 ? 'warn' : 'danger',
      },
    ],
  };
}

function normalizeState() {
  state.city.resources.population = Math.max(0, roundNumber(state.city.resources.population));
  state.city.resources.treasury = roundNumber(state.city.resources.treasury);
  state.city.resources.food = Math.max(0, roundNumber(state.city.resources.food));
  state.city.resources.unrest = clamp(roundNumber(state.city.resources.unrest), 0, 100);
  state.city.districts = state.city.districts.map((district) => ({
    ...district,
    development: clamp(roundNumber(district.development, 3), 0.22, 1.4),
    condition: clamp(roundNumber(district.condition, 3), 0.22, 1.2),
  }));
  state.city.assets = state.city.assets.map((asset) => ({
    ...asset,
    level: clamp(Math.round(asset.level), 1, asset.maxLevel),
  }));
  state.sim.speed = currentSpeedOption().value;
  state.sim.tick = Math.max(0, Math.round(state.sim.tick));
  state.sim.seasonLength = Math.max(1, Math.round(state.sim.seasonLength || TICKS_PER_SEASON));
  state.sim.seasonTick = clamp(Math.round(state.sim.seasonTick), 0, state.sim.seasonLength);
  state.sim.accumulatorMs = Math.max(0, state.sim.accumulatorMs || 0);
  state.sim.lastFrameMs = Math.max(0, state.sim.lastFrameMs || 0);
  state.sim.seasonProgress = clamp(state.sim.seasonTick / state.sim.seasonLength, 0, 1);
  state.ui.hoveredTarget = state.ui.hoveredTarget ?? null;
  recomputeDerivedState();

  if (!getDistrictByKey(state.ui.selection.key) && !getAssetByKey(state.ui.selection.key)) {
    state.ui.selection = { kind: 'district', key: 'civic' };
  }

  if (!state.gameOver && state.city.resources.population <= 0) {
    state.gameOver = true;
    state.sim.paused = true;
    logEvent('The city has emptied out. District systems fall silent without residents to sustain them.');
  } else if (!state.gameOver && state.city.resources.unrest >= 100) {
    state.gameOver = true;
    state.sim.paused = true;
    logEvent('Systemic strain breaks the charter. Stonehaven collapses into open revolt.');
  }
}

function selectedHousingAsset() {
  const options = ['north-terraces', 'south-crossings']
    .map((key) => getAssetByKey(key))
    .filter(Boolean)
    .filter((asset) => asset.level < asset.maxLevel)
    .map((asset) => {
      const district = getDistrictByKey(asset.districtKey);
      return {
        asset,
        score: (district?.growthTrend ?? 0) - (district?.localUnrest ?? 0) * 0.01 + asset.level * -0.1,
      };
    })
    .sort((left, right) => right.score - left.score);

  return options[0]?.asset ?? null;
}

function selectedAssetForAction(actionKey) {
  if (state.ui.selection.kind === 'asset') {
    const asset = getAssetByKey(state.ui.selection.key);
    const matchesAction =
      (actionKey === 'housing' && ['north-terraces', 'south-crossings'].includes(asset?.key))
      || (actionKey === 'grid' && asset?.key === 'harbor-grid')
      || (actionKey === 'industry' && asset?.key === 'industry-foundry')
      || (actionKey === 'services' && asset?.key === 'civic-hall');
    if (asset && matchesAction && asset.level < asset.maxLevel) {
      return asset;
    }
  }

  if (state.ui.selection.kind === 'district') {
    const district = getDistrictByKey(state.ui.selection.key);
    const preferredKey =
      actionKey === 'housing' && district?.type === 'residential' ? 'north-terraces'
      : actionKey === 'housing' && district?.type === 'mixed' ? 'south-crossings'
      : actionKey === 'grid' && district?.key === 'harbor' ? 'harbor-grid'
      : actionKey === 'industry' && district?.key === 'industry' ? 'industry-foundry'
      : actionKey === 'services' && district?.key === 'civic' ? 'civic-hall'
      : null;
    const asset = preferredKey ? getAssetByKey(preferredKey) : null;
    if (asset && asset.level < asset.maxLevel) {
      return asset;
    }
  }

  return null;
}

function upgradeAsset(assetKey, cost) {
  const asset = getAssetByKey(assetKey);
  if (!asset || asset.level >= asset.maxLevel) return false;
  if (state.city.resources.treasury < cost) return false;
  state.city.resources.treasury -= cost;
  asset.level += 1;
  return true;
}

function applyAction(type) {
  if (state.gameOver || state.actionsLeft <= 0) return;

  let applied = false;
  if (type === 'housing') {
    const asset = selectedAssetForAction(type) ?? selectedHousingAsset();
    if (asset) {
      const cost = 22 + asset.level * 6;
      applied = upgradeAsset(asset.key, cost);
      if (applied) {
        logEvent(`${asset.label} expands in ${getDistrictByKey(asset.districtKey)?.label}. More housing comes online, but service demand rises too.`);
      }
    }
  }

  if (type === 'grid') {
    const asset = selectedAssetForAction(type) ?? getAssetByKey('harbor-grid');
    if (asset) {
      const cost = 24 + asset.level * 8;
      applied = upgradeAsset(asset.key, cost);
      if (applied) {
        state.city.resources.unrest = Math.max(0, state.city.resources.unrest - 3);
        logEvent('Rivergate hardens the utility grid. Power and water margins improve immediately.');
      }
    }
  }

  if (type === 'industry') {
    const asset = selectedAssetForAction(type) ?? getAssetByKey('industry-foundry');
    if (asset) {
      const cost = 20 + asset.level * 8;
      applied = upgradeAsset(asset.key, cost);
      if (applied) {
        state.city.resources.unrest += 2;
        logEvent('Ironworks receives fresh capital. Output and jobs rise, but district pressure sharpens.');
      }
    }
  }

  if (type === 'services') {
    const asset = selectedAssetForAction(type) ?? getAssetByKey('civic-hall');
    if (asset) {
      const cost = 18 + asset.level * 7;
      applied = upgradeAsset(asset.key, cost);
      if (applied) {
        state.city.resources.unrest = Math.max(0, state.city.resources.unrest - 7);
        state.city.resources.population += 1.2;
        logEvent('Civic services deepen. Satisfaction rebounds and a few new households decide to stay.');
      }
    }
  }

  if (!applied) return;

  state.actionsLeft -= 1;
  normalizeState();
  render();
}

function syncAlerts() {
  const nextAlerts = state.city.systems.pressure;
  const previous = state.city.alerts;
  const districtUnderMostPressure = [...state.city.districts].sort((left, right) => {
    const leftRisk = left.localUnrest + left.metrics.utilityLoad * 30 + left.metrics.servicePressure * 24;
    const rightRisk = right.localUnrest + right.metrics.utilityLoad * 30 + right.metrics.servicePressure * 24;
    return rightRisk - leftRisk;
  })[0];
  const districtWithGrowth = [...state.city.districts].sort((left, right) => right.growthTrend - left.growthTrend)[0];

  if (nextAlerts.utilityStrain && !previous.utilityStrain) {
    logEvent('Utility strain spreads through the grid. District activity starts throttling under constrained supply.');
  }
  if (nextAlerts.housingShortage && !previous.housingShortage) {
    logEvent('Housing demand outruns capacity. Overcrowding begins pushing up local tension.');
  }
  if (nextAlerts.congestion && !previous.congestion) {
    logEvent('Congestion forms along the main corridors. Movement inefficiency starts dragging on production.');
  }
  if (nextAlerts.declinePressure && !previous.declinePressure && districtUnderMostPressure) {
    logEvent(`${districtUnderMostPressure.label} starts to slip under compound pressure from utilities, services, and unrest.`);
  }
  if (nextAlerts.growthPressure && !previous.growthPressure && districtWithGrowth) {
    logEvent(`${districtWithGrowth.label} picks up development momentum as the city leans into new demand.`);
  }

  state.city.alerts = {
    utilityStrain: nextAlerts.utilityStrain,
    housingShortage: nextAlerts.housingShortage,
    congestion: nextAlerts.congestion,
    declinePressure: nextAlerts.declinePressure,
    growthPressure: nextAlerts.growthPressure,
  };
}

function tickCity() {
  if (state.gameOver) return;

  const systems = state.city.systems;
  const growthSignal =
    (systems.mood.satisfaction - 54) / 24
    + systems.pressure.growth * 0.32
    - systems.pressure.decline * 0.24
    - state.city.resources.unrest / 70;
  const populationDelta = clamp(growthSignal, -3.2, 2.8);
  const unrestDelta = clamp((systems.mood.unrestTarget - state.city.resources.unrest) * 0.18, -4.2, 5.4);
  const foodDelta = systems.food.delta;
  const treasuryDelta = systems.economy.treasuryDelta;

  state.city.resources.population += populationDelta;
  state.city.resources.food += foodDelta;
  state.city.resources.treasury += treasuryDelta;
  state.city.resources.unrest += unrestDelta;

  if (state.city.resources.food <= 0 && foodDelta < 0) {
    const shortage = Math.abs(state.city.resources.food);
    state.city.resources.food = 0;
    state.city.resources.population -= clamp(shortage * 0.5, 0.4, 3.2);
    state.city.resources.unrest += 4 + shortage * 0.6;
  }

  if (state.city.resources.treasury < -45) {
    state.city.resources.unrest += 1.4;
  }

  state.city.districts.forEach((district) => {
    const districtUtilityPenalty = Math.max(0, district.metrics.utilityLoad - 0.95);
    const districtServicePenalty = Math.max(0, district.metrics.servicePressure - 1);
    const developmentDelta = clamp(
      district.growthTrend * 0.014 - districtUtilityPenalty * 0.012 - district.localUnrest / 500,
      -0.026,
      0.028,
    );
    const conditionDelta = clamp(
      ((1.02 - districtUtilityPenalty - districtServicePenalty) - district.localUnrest / 100) * 0.01,
      -0.018,
      0.018,
    );
    district.development += developmentDelta;
    district.condition += conditionDelta;
  });

  state.sim.tick += 1;
  state.sim.seasonTick += 1;
  normalizeState();
  syncAlerts();

  if (state.sim.seasonTick >= state.sim.seasonLength) {
    advanceSeason();
    return;
  }

  render();
}

function seasonSummary() {
  const systems = state.city.systems;
  return `${currentSeason()} closes with ${Math.round(systems.economy.production)} output, ${Math.round(systems.food.production)} food, utility coverage at ${Math.round(Math.min(systems.utilities.power.coverage, systems.utilities.water.coverage) * 100)}%, and satisfaction at ${Math.round(systems.mood.satisfaction)}%.`;
}

function advanceSeason() {
  if (state.gameOver) return;

  logEvent(seasonSummary());
  state.turn += 1;
  state.actionsLeft = ACTION_LIMIT;
  state.seasonIndex += 1;
  state.sim.seasonTick = 0;
  state.sim.seasonProgress = 0;

  if (state.seasonIndex >= SEASONS.length) {
    state.seasonIndex = 0;
    state.year += 1;
    state.city.resources.treasury += 10;
    logEvent('A new year starts. Contract renewals add a modest treasury cushion for the next cycle.');
  } else {
    logEvent(`${currentSeason()} begins. Baseline pressures shift with the new weather.`);
  }

  normalizeState();
  syncAlerts();
  render();
}

function togglePause(forceValue) {
  state.sim.paused = typeof forceValue === 'boolean' ? forceValue : !state.sim.paused;
  state.sim.lastFrameMs = 0;
  render();
}

function setSpeed(speed) {
  if (!SPEED_OPTIONS.some((option) => option.value === speed)) return;
  state.sim.speed = speed;
  state.sim.accumulatorMs = 0;
  state.sim.lastFrameMs = 0;
  render();
}

function rushSeason() {
  if (state.gameOver) return;
  const seasonTurn = state.turn;
  while (!state.gameOver && state.turn === seasonTurn) {
    tickCity();
  }
}

function resourceTone(key, value) {
  if (key === 'satisfaction') return value >= 65 ? 'good' : value >= 45 ? 'warn' : 'danger';
  if (key === 'treasury') return value < 0 ? 'danger' : value < 40 ? 'warn' : 'good';
  if (key === 'food') return value < 25 ? 'danger' : value < 70 ? 'warn' : 'good';
  return value < 140 ? 'warn' : 'good';
}

function seasonPalette(season) {
  const palettes = {
    Spring: {
      skyTop: '#4f8fb5',
      skyBottom: '#d7f1ff',
      land: '#314f3b',
      glow: 'rgba(150, 227, 184, 0.28)',
      river: '#67b7df',
    },
    Summer: {
      skyTop: '#4b7fb1',
      skyBottom: '#eef6ff',
      land: '#3f5633',
      glow: 'rgba(255, 208, 126, 0.24)',
      river: '#5cb2dd',
    },
    Autumn: {
      skyTop: '#6f6e8e',
      skyBottom: '#f1d9b8',
      land: '#4a4132',
      glow: 'rgba(255, 165, 92, 0.26)',
      river: '#6294b7',
    },
    Winter: {
      skyTop: '#49617c',
      skyBottom: '#eef7ff',
      land: '#2d3945',
      glow: 'rgba(155, 213, 255, 0.2)',
      river: '#75a8c6',
    },
  };

  return palettes[season] ?? palettes.Spring;
}

function createCityViewModel() {
  const systems = state.city.systems;
  const districts = state.city.districts.map((district) => ({
    ...district,
    intensity: clamp(Math.round(2 + district.development * 5 + district.condition * 2), 2, 9),
    utilityTone: toneFromRatio(1 / Math.max(district.metrics.utilityLoad, 0.6)),
    growthTone: district.growthTrend > 1 ? 'good' : district.growthTrend > -0.4 ? 'warn' : 'danger',
  })).sort((left, right) => (left.y + left.h) - (right.y + right.h));

  return {
    palette: seasonPalette(currentSeason()),
    districts,
    overlays: systems.overlays,
    demand: systems.demand,
    skyline: {
      towers: clamp(3 + Math.round(systems.economy.production / 34), 3, 8),
      cranes: clamp(1 + Math.round(Math.max(0, systems.pressure.growth)), 1, 5),
      smoke: clamp(Math.round(state.city.resources.unrest / 18 + systems.economy.production / 44), 0, 6),
    },
    stats: {
      season: currentSeason(),
      population: Math.round(state.city.resources.population),
      treasury: Math.round(state.city.resources.treasury),
      unrest: Math.round(state.city.resources.unrest),
      satisfaction: Math.round(systems.mood.satisfaction),
      activityLevel: Math.round(systems.summary.activity),
    },
  };
}

function roundedRect(context, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
}

function fillRoundedRect(context, x, y, width, height, radius, fillStyle) {
  roundedRect(context, x, y, width, height, radius);
  context.fillStyle = fillStyle;
  context.fill();
}

function strokeRoundedRect(context, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
  roundedRect(context, x, y, width, height, radius);
  context.lineWidth = lineWidth;
  context.strokeStyle = strokeStyle;
  context.stroke();
}

function createWorkingCanvas(width, height) {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

function loadImageAsset(src, whiteToAlpha = false) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      if (!whiteToAlpha) {
        resolve(image);
        return;
      }

      const canvas = createWorkingCanvas(image.naturalWidth, image.naturalHeight);
      const context = canvas.getContext('2d', { willReadFrequently: true });
      if (!context) {
        resolve(image);
        return;
      }

      context.drawImage(image, 0, 0);
      const data = context.getImageData(0, 0, canvas.width, canvas.height);
      for (let index = 0; index < data.data.length; index += 4) {
        const red = data.data[index];
        const green = data.data[index + 1];
        const blue = data.data[index + 2];
        if (red > 244 && green > 244 && blue > 244) {
          data.data[index + 3] = 0;
        }
      }
      context.putImageData(data, 0, 0);
      resolve(canvas);
    };
    image.onerror = () => reject(new Error(`Failed to load ${src}`));
    image.src = src;
  });
}

function ensureSpriteLibrary() {
  if (spriteLibrary.ready || spriteLoadPromise) return;

  spriteLoadPromise = Promise.all([
    loadImageAsset(OPEN_ASSET_FILES.city, true),
    loadImageAsset(OPEN_ASSET_FILES.municipal, true),
    loadImageAsset(OPEN_ASSET_FILES.brick, true),
    loadImageAsset(OPEN_ASSET_FILES.brickLarge, true),
    loadImageAsset(OPEN_ASSET_FILES.roadsA),
    loadImageAsset(OPEN_ASSET_FILES.roadsB),
  ])
    .then(([city, municipal, brick, brickLarge, roadsA, roadsB]) => {
      spriteLibrary.images = { city, municipal, brick, brickLarge, roadsA, roadsB };
      spriteLibrary.ready = true;
      paintCityMap();
    })
    .catch(() => {
      spriteLibrary.failed = true;
    });
}

function spriteSourceRect(image, region) {
  return {
    sx: Math.floor(image.width * region[0]),
    sy: Math.floor(image.height * region[1]),
    sw: Math.max(1, Math.floor(image.width * region[2])),
    sh: Math.max(1, Math.floor(image.height * region[3])),
  };
}

function roadTileRect(index) {
  const columns = 6;
  return {
    sx: (index % columns) * ROAD_TILE_SIZE,
    sy: Math.floor(index / columns) * ROAD_TILE_SIZE,
    sw: ROAD_TILE_SIZE,
    sh: ROAD_TILE_SIZE,
  };
}

function roadTileRectWide(index) {
  const columns = 10;
  return {
    sx: (index % columns) * ROAD_TILE_SIZE,
    sy: Math.floor(index / columns) * ROAD_TILE_SIZE,
    sw: ROAD_TILE_SIZE,
    sh: ROAD_TILE_SIZE,
  };
}

function drawSpriteRegion(context, image, region, dx, dy, dw, dh, alpha = 1) {
  if (!image) return;
  const { sx, sy, sw, sh } = spriteSourceRect(image, region);
  context.save();
  context.imageSmoothingEnabled = false;
  context.globalAlpha = alpha;
  context.drawImage(image, sx, sy, sw, sh, dx, dy, dw, dh);
  context.restore();
}

function drawRoadTile(context, tile, dx, dy, size, rotation = 0, alpha = 1) {
  const image = spriteLibrary.images[tile.sheet];
  if (!image) return;
  const source = tile.sheet === 'roadsA' ? roadTileRect(tile.index) : roadTileRectWide(tile.index);
  context.save();
  context.translate(dx, dy);
  context.rotate(rotation);
  context.imageSmoothingEnabled = false;
  context.globalAlpha = alpha;
  context.drawImage(
    image,
    source.sx,
    source.sy,
    source.sw,
    source.sh,
    -size / 2,
    -size / 2,
    size,
    size,
  );
  context.restore();
}

function districtColor(type) {
  const colors = {
    civic: ['#7daab5', '#243746'],
    residential: ['#7396a2', '#213540'],
    utility: ['#658aa4', '#1c2d39'],
    commercial: ['#a88758', '#3b2a1c'],
    industrial: ['#997056', '#39251b'],
    park: ['#567e5d', '#1d3222'],
    mixed: ['#8b7896', '#2c2438'],
  };

  return colors[type] ?? colors.mixed;
}

function districtAccent(type) {
  const accents = {
    civic: '#cdeeff',
    residential: '#c9efff',
    utility: '#7be0ff',
    commercial: '#ffd089',
    industrial: '#ffb67d',
    park: '#a8e78e',
    mixed: '#e3c0ff',
  };

  return accents[type] ?? '#dbeeff';
}

function districtRoadGrid(type) {
  switch (type) {
    case 'civic':
      return { cols: 3, rows: 3, plaza: true, diagonal: false };
    case 'residential':
      return { cols: 4, rows: 4, plaza: false, diagonal: false };
    case 'utility':
      return { cols: 3, rows: 2, plaza: false, diagonal: false };
    case 'commercial':
      return { cols: 4, rows: 3, plaza: true, diagonal: false };
    case 'industrial':
      return { cols: 4, rows: 3, plaza: false, diagonal: true };
    case 'park':
      return { cols: 2, rows: 2, plaza: true, diagonal: true };
    case 'mixed':
      return { cols: 4, rows: 3, plaza: false, diagonal: false };
    default:
      return { cols: 3, rows: 3, plaza: false, diagonal: false };
  }
}

function roadCrossSection(road, width) {
  const base = road.avenue ? Math.max(26, width * 0.024) : Math.max(16, width * 0.015);
  return {
    shadow: base * 1.42,
    shoulder: base * 1.15,
    asphalt: base,
    inner: base * (road.avenue ? 0.86 : 0.78),
    median: road.avenue ? base * 0.16 : 0,
  };
}

function drawRoadNetwork(context, width, height) {
  ROAD_SEGMENTS.forEach((road) => {
    const x1 = road.x1 * width;
    const y1 = road.y1 * height;
    const x2 = road.x2 * width;
    const y2 = road.y2 * height;
    const axisAligned = Math.abs(x1 - x2) < 1 || Math.abs(y1 - y2) < 1;
    const roadWidth = roadCrossSection(road, width);
    const angle = Math.atan2(y2 - y1, x2 - x1);
    const trafficPulse = ((state.sim.tick % 24) / 24);

    context.lineCap = 'round';
    context.strokeStyle = 'rgba(3, 7, 10, 0.42)';
    context.lineWidth = roadWidth.shadow;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();

    context.strokeStyle = road.avenue ? 'rgba(138, 150, 158, 0.34)' : 'rgba(117, 128, 138, 0.24)';
    context.lineWidth = roadWidth.shoulder;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();

    context.strokeStyle = road.avenue ? 'rgba(31, 35, 39, 0.98)' : 'rgba(27, 31, 36, 0.96)';
    context.lineWidth = roadWidth.asphalt;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();

    context.strokeStyle = road.avenue ? 'rgba(86, 95, 103, 0.38)' : 'rgba(78, 86, 96, 0.26)';
    context.lineWidth = roadWidth.inner;
    context.beginPath();
    context.moveTo(x1, y1);
    context.lineTo(x2, y2);
    context.stroke();

    if (road.avenue) {
      context.strokeStyle = 'rgba(73, 138, 98, 0.82)';
      context.lineWidth = Math.max(2, roadWidth.median);
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
    }

    if (axisAligned) {
      context.strokeStyle = road.avenue ? 'rgba(255, 241, 182, 0.72)' : 'rgba(255, 243, 191, 0.44)';
      context.lineWidth = road.avenue ? 2.8 : 1.4;
      context.setLineDash(road.avenue ? [12, 18] : [8, 14]);
      context.beginPath();
      context.moveTo(x1, y1);
      context.lineTo(x2, y2);
      context.stroke();
      context.setLineDash([]);
    }

    if (road.avenue) {
      const pulseX = lerp(x1, x2, trafficPulse);
      const pulseY = lerp(y1, y2, trafficPulse);
      context.fillStyle = 'rgba(255, 212, 120, 0.26)';
      context.beginPath();
      context.arc(pulseX, pulseY, roadWidth.asphalt * 0.28, 0, Math.PI * 2);
      context.fill();
    }

    if (!spriteLibrary.ready) return;

    const distance = Math.hypot(x2 - x1, y2 - y1);
    const steps = Math.max(2, Math.floor(distance / (roadWidth.asphalt * 0.78)));
    const tileA = road.avenue ? ROAD_TILE_LIBRARY.avenueA : ROAD_TILE_LIBRARY.diagonal;
    const tileB = road.avenue ? ROAD_TILE_LIBRARY.avenueB : ROAD_TILE_LIBRARY.reverse;
    for (let step = 0; step <= steps; step += 1) {
      const t = step / Math.max(steps, 1);
      const tileX = lerp(x1, x2, t);
      const tileY = lerp(y1, y2, t);
      const tile = step % 2 === 0 ? tileA : tileB;
      drawRoadTile(context, tile, tileX, tileY, roadWidth.asphalt * 1.25, angle, road.avenue ? 0.76 : 0.64);
    }

    drawRoadTile(context, road.avenue ? ROAD_TILE_LIBRARY.capA : ROAD_TILE_LIBRARY.edge, x1, y1, roadWidth.asphalt * 1.15, angle, 0.78);
    drawRoadTile(context, road.avenue ? ROAD_TILE_LIBRARY.capB : ROAD_TILE_LIBRARY.edge, x2, y2, roadWidth.asphalt * 1.15, angle + Math.PI, 0.78);
  });

  if (!spriteLibrary.ready) return;

  ROAD_SEGMENTS.forEach((vertical) => {
    ROAD_SEGMENTS.forEach((horizontal) => {
      const isVertical = Math.abs(vertical.x1 - vertical.x2) < 0.001;
      const isHorizontal = Math.abs(horizontal.y1 - horizontal.y2) < 0.001;
      if (!isVertical || !isHorizontal) return;
      const x = vertical.x1 * width;
      const y = horizontal.y1 * height;
      if (y < Math.min(vertical.y1, vertical.y2) * height || y > Math.max(vertical.y1, vertical.y2) * height) return;
      if (x < Math.min(horizontal.x1, horizontal.x2) * width || x > Math.max(horizontal.x1, horizontal.x2) * width) return;
      const size = (vertical.avenue || horizontal.avenue) ? Math.max(28, width * 0.026) : Math.max(22, width * 0.02);
      context.fillStyle = (vertical.avenue || horizontal.avenue) ? 'rgba(247, 238, 194, 0.08)' : 'rgba(255, 255, 255, 0.03)';
      fillRoundedRect(context, x - size * 0.9, y - size * 0.9, size * 1.8, size * 1.8, 10, context.fillStyle);
      drawRoadTile(context, ROAD_TILE_LIBRARY.hub, x, y, size, 0, 0.82);
      if (vertical.avenue || horizontal.avenue) {
        context.strokeStyle = 'rgba(255, 241, 182, 0.42)';
        context.lineWidth = 1.5;
        context.setLineDash([5, 5]);
        context.beginPath();
        context.moveTo(x - size * 0.6, y);
        context.lineTo(x + size * 0.6, y);
        context.moveTo(x, y - size * 0.6);
        context.lineTo(x, y + size * 0.6);
        context.stroke();
        context.setLineDash([]);
      }
    });
  });
}

function drawWaterfront(context, width, height, palette) {
  const gradient = context.createLinearGradient(0, 0, width * 0.25, height);
  gradient.addColorStop(0, palette.river);
  gradient.addColorStop(1, '#14354a');
  context.fillStyle = gradient;
  context.beginPath();
  context.moveTo(0, height * 0.08);
  context.bezierCurveTo(width * 0.04, height * 0.22, width * 0.02, height * 0.56, width * 0.08, height * 0.92);
  context.lineTo(0, height);
  context.closePath();
  context.fill();

  if (!spriteLibrary.ready) return;

  for (let pier = 0; pier < 5; pier += 1) {
    const px = width * (0.065 + pier * 0.008);
    const py = height * (0.24 + pier * 0.12);
    drawRoadTile(context, ROAD_TILE_LIBRARY.edge, px, py, Math.max(16, width * 0.012), Math.PI / 2, 0.55);
  }

  context.strokeStyle = 'rgba(205, 244, 255, 0.22)';
  context.lineWidth = Math.max(2, width * 0.003);
  for (let ripple = 0; ripple < 4; ripple += 1) {
    const y = height * (0.18 + ripple * 0.16 + ((state.sim.tick + ripple * 2) % 10) * 0.0016);
    context.beginPath();
    context.moveTo(width * 0.012, y);
    context.bezierCurveTo(width * 0.025, y - 4, width * 0.055, y + 4, width * 0.082, y);
    context.stroke();
  }
}

function drawDistrictGround(context, district, frame) {
  const grid = districtRoadGrid(district.type);
  const gridGapX = frame.w / (grid.cols + 0.8);
  const gridGapY = frame.h / (grid.rows + 0.9);
  context.fillStyle = district.type === 'park' ? 'rgba(73, 110, 78, 0.88)' : 'rgba(26, 33, 39, 0.68)';
  context.fillRect(frame.x, frame.y, frame.w, frame.h);

  const blockTone =
    district.type === 'commercial' ? 'rgba(255, 207, 136, 0.08)'
    : district.type === 'industrial' ? 'rgba(255, 176, 128, 0.06)'
    : district.type === 'park' ? 'rgba(168, 231, 142, 0.08)'
    : 'rgba(219, 238, 255, 0.04)';
  context.fillStyle = blockTone;
  for (let row = 0; row < grid.rows; row += 1) {
    for (let col = 0; col < grid.cols; col += 1) {
      const lotX = frame.x + gridGapX * (col + 0.22);
      const lotY = frame.y + gridGapY * (row + 0.28);
      const lotW = gridGapX * (district.type === 'civic' ? 0.88 : 0.72);
      const lotH = gridGapY * (district.type === 'park' ? 0.58 : 0.62);
      fillRoundedRect(context, lotX, lotY, lotW, lotH, 8, context.fillStyle);
    }
  }

  context.strokeStyle = district.type === 'park' ? 'rgba(128, 186, 129, 0.22)' : 'rgba(255, 255, 255, 0.08)';
  context.lineWidth = 1;
  for (let x = frame.x + gridGapX * 0.6; x < frame.x + frame.w; x += gridGapX) {
    context.beginPath();
    context.moveTo(x, frame.y);
    context.lineTo(x, frame.y + frame.h);
    context.stroke();
  }
  for (let y = frame.y + gridGapY * 0.5; y < frame.y + frame.h; y += gridGapY) {
    context.beginPath();
    context.moveTo(frame.x, y);
    context.lineTo(frame.x + frame.w, y);
    context.stroke();
  }

  if (grid.diagonal) {
    context.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    context.beginPath();
    context.moveTo(frame.x, frame.y + frame.h * 0.86);
    context.lineTo(frame.x + frame.w * 0.32, frame.y + frame.h * 0.44);
    context.lineTo(frame.x + frame.w, frame.y + frame.h * 0.08);
    context.stroke();
  }

  if (district.type === 'park') {
    context.fillStyle = 'rgba(154, 204, 132, 0.18)';
    fillRoundedRect(context, frame.x + frame.w * 0.08, frame.y + frame.h * 0.12, frame.w * 0.84, frame.h * 0.7, 18, context.fillStyle);
  }

  if (grid.plaza) {
    context.fillStyle = district.type === 'civic' ? 'rgba(239, 243, 248, 0.12)' : 'rgba(246, 214, 155, 0.1)';
    fillRoundedRect(context, frame.x + frame.w * 0.31, frame.y + frame.h * 0.3, frame.w * 0.24, frame.h * 0.2, 10, context.fillStyle);
  }
}

function drawDistrictFallback(context, district, frame) {
  const columns = district.type === 'park' ? 3 : district.type === 'industrial' ? 4 : 5;
  const rows = district.type === 'park' ? 2 : 3;
  const gutter = frame.w * 0.04;
  const cellWidth = (frame.w - gutter * (columns + 1)) / columns;
  const baseY = frame.y + frame.h - gutter;

  for (let row = 0; row < rows; row += 1) {
    for (let col = 0; col < columns; col += 1) {
      const x = frame.x + gutter + col * (cellWidth + gutter);
      const seed = district.intensity + row * 2 + col;
      const normalized = ((seed % 7) + 2) / 10;
      const minHeight = district.type === 'park' ? frame.h * 0.12 : frame.h * 0.18;
      const maxHeight = district.type === 'civic' ? frame.h * 0.7 : frame.h * 0.52;
      const buildingHeight = minHeight + (maxHeight - minHeight) * normalized;
      const y = baseY - buildingHeight - row * (frame.h * 0.03);

      if (district.type === 'park') {
        context.fillStyle = seed % 2 === 0 ? 'rgba(100, 176, 101, 0.92)' : 'rgba(73, 133, 78, 0.88)';
        context.beginPath();
        context.arc(x + cellWidth * 0.5, y + buildingHeight * 0.55, cellWidth * 0.42, 0, Math.PI * 2);
        context.fill();
        continue;
      }

      context.fillStyle = 'rgba(17, 25, 32, 0.9)';
      fillRoundedRect(context, x, y, cellWidth, buildingHeight, Math.max(4, frame.w * 0.01), context.fillStyle);
    }
  }
}

function drawDistrictSprites(context, district, frame) {
  const spriteDefs = DISTRICT_SPRITES[district.type] ?? DISTRICT_SPRITES.mixed;
  if (!spriteLibrary.ready) {
    drawDistrictFallback(context, district, frame);
    return;
  }

  const clusterBaseY = frame.y + frame.h * 0.83;
  for (let band = 0; band < 3; band += 1) {
    const bandWidth = frame.w * (0.2 + band * 0.12);
    const bandX = frame.x + frame.w * (0.08 + band * 0.22);
    const bandY = clusterBaseY - band * frame.h * 0.08;
    context.fillStyle = 'rgba(4, 8, 12, 0.18)';
    context.beginPath();
    context.ellipse(bandX + bandWidth * 0.5, bandY, bandWidth * 0.62, frame.h * 0.06, 0, 0, Math.PI * 2);
    context.fill();
  }

  if (district.type === 'park') {
    for (let patch = 0; patch < 7; patch += 1) {
      const x = frame.x + frame.w * (0.08 + (patch % 4) * 0.2);
      const y = frame.y + frame.h * (0.3 + Math.floor(patch / 4) * 0.24);
      context.fillStyle = patch % 2 === 0 ? 'rgba(116, 176, 98, 0.92)' : 'rgba(87, 139, 83, 0.88)';
      context.beginPath();
      context.arc(x, y, frame.w * 0.07, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = 'rgba(68, 48, 35, 0.7)';
      context.fillRect(x - frame.w * 0.008, y, frame.w * 0.016, frame.h * 0.08);
    }
  }

  spriteDefs.forEach((spriteDef, index) => {
    const image = spriteLibrary.images[spriteDef.sheet];
    if (!image) return;
    const [ax, ay, aw, ah] = spriteDef.anchor;
    const drift = (state.sim.tick + index * 3) % 6;
    const dx = frame.x + frame.w * ax;
    const dy = frame.y + frame.h * ay - drift * 0.15;
    const dw = frame.w * aw * lerp(0.94, 1.06, district.development / 1.4);
    const dh = frame.h * ah * lerp(0.92, 1.08, district.condition);
    context.fillStyle = 'rgba(3, 6, 9, 0.18)';
    context.beginPath();
    context.ellipse(dx + dw * 0.5, dy + dh * 0.94, dw * 0.34, dh * 0.07, 0, 0, Math.PI * 2);
    context.fill();
    drawSpriteRegion(context, image, spriteDef.region, dx, dy, dw, dh, 0.92);
  });

  if (district.type === 'commercial' || district.type === 'mixed') {
    context.fillStyle = 'rgba(255, 209, 117, 0.16)';
    for (let stripe = 0; stripe < 5; stripe += 1) {
      fillRoundedRect(
        context,
        frame.x + frame.w * (0.08 + stripe * 0.17),
        frame.y + frame.h * 0.72,
        frame.w * 0.1,
        frame.h * 0.05,
        6,
        context.fillStyle,
      );
    }
  }

  if (district.type === 'utility') {
    context.strokeStyle = 'rgba(120, 222, 255, 0.6)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(frame.x + frame.w * 0.18, frame.y + frame.h * 0.78);
    context.lineTo(frame.x + frame.w * 0.82, frame.y + frame.h * 0.78);
    context.lineTo(frame.x + frame.w * 0.82, frame.y + frame.h * 0.22);
    context.stroke();
  }

  if (district.type === 'industrial') {
    for (let stack = 0; stack < 3; stack += 1) {
      const x = frame.x + frame.w * (0.2 + stack * 0.22);
      const y = frame.y + frame.h * 0.28 - stack * 4;
      context.fillStyle = 'rgba(94, 100, 108, 0.22)';
      context.beginPath();
      context.arc(x, y, frame.w * 0.06, 0, Math.PI * 2);
      context.fill();
    }
  }

  if (district.type === 'residential' || district.type === 'mixed') {
    context.fillStyle = 'rgba(248, 214, 136, 0.22)';
    for (let windowBand = 0; windowBand < 4; windowBand += 1) {
      fillRoundedRect(
        context,
        frame.x + frame.w * (0.12 + windowBand * 0.18),
        frame.y + frame.h * 0.62,
        frame.w * 0.08,
        frame.h * 0.028,
        5,
        context.fillStyle,
      );
    }
  }
}

function drawDistrict(context, district, width, height) {
  const x = district.x * width;
  const y = district.y * height;
  const w = district.w * width;
  const h = district.h * height;
  const [fill, shade] = districtColor(district.type);
  const accent = districtAccent(district.type);
  const gradient = context.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, fill);
  gradient.addColorStop(1, shade);

  context.fillStyle = 'rgba(4, 8, 12, 0.22)';
  fillRoundedRect(context, x + 8, y + h * 0.08, w, h, Math.max(16, width * 0.018), context.fillStyle);
  fillRoundedRect(context, x, y, w, h, Math.max(16, width * 0.018), gradient);
  strokeRoundedRect(
    context,
    x,
    y,
    w,
    h,
    Math.max(16, width * 0.018),
    district.growthTone === 'good' ? 'rgba(158, 226, 173, 0.74)' : district.growthTone === 'danger' ? 'rgba(255, 159, 145, 0.78)' : 'rgba(255, 255, 255, 0.2)',
    district.growthTone === 'warn' ? 1.2 : 2,
  );

  const inner = { x: x + w * 0.04, y: y + h * 0.1, w: w * 0.92, h: h * 0.74 };
  context.fillStyle = 'rgba(255, 255, 255, 0.04)';
  fillRoundedRect(context, inner.x, inner.y, inner.w, inner.h, Math.max(12, width * 0.015), context.fillStyle);

  context.save();
  roundedRect(context, inner.x, inner.y, inner.w, inner.h, Math.max(12, width * 0.015));
  context.clip();
  drawDistrictGround(context, district, inner);
  drawDistrictSprites(context, district, inner);
  context.restore();

  const selection = selectionMatches('district', district.key);
  const hovered = hoverMatches('district', district.key);
  if (selection || hovered) {
    context.fillStyle = selection ? 'rgba(255, 255, 255, 0.08)' : 'rgba(255, 255, 255, 0.04)';
    fillRoundedRect(context, x - 8, y - 8, w + 16, h + 16, Math.max(20, width * 0.022), context.fillStyle);
    strokeRoundedRect(
      context,
      x - 4,
      y - 4,
      w + 8,
      h + 8,
      Math.max(18, width * 0.02),
      selection ? accent : 'rgba(255, 255, 255, 0.72)',
      selection ? 2.5 : 1.8,
    );
    if (selection) {
      context.strokeStyle = `${accent}66`;
      context.lineWidth = 2;
      context.setLineDash([10, 8]);
      context.beginPath();
      context.moveTo(x + w * 0.06, y + h * 0.06);
      context.lineTo(x + w * 0.94, y + h * 0.06);
      context.lineTo(x + w * 0.94, y + h * 0.94);
      context.lineTo(x + w * 0.06, y + h * 0.94);
      context.closePath();
      context.stroke();
      context.setLineDash([]);
    }
  }

  context.fillStyle = `${accent}cc`;
  context.font = `700 ${Math.max(9, width * 0.009)}px "Trebuchet MS", sans-serif`;
  context.fillText(DISTRICT_TYPE_LABELS[district.type] ?? district.type.toUpperCase(), x + w * 0.07, y + h * 0.12);

  context.fillStyle = '#f5fbff';
  context.font = `600 ${Math.max(12, width * 0.018)}px "Trebuchet MS", sans-serif`;
  context.fillText(district.label, x + w * 0.07, y + h * 0.2);

  context.fillStyle = district.utilityTone === 'good' ? '#9ee2ad' : district.utilityTone === 'warn' ? '#ffd37f' : '#ff9f91';
  context.font = `500 ${Math.max(10, width * 0.013)}px "Trebuchet MS", sans-serif`;
  context.fillText(district.status, x + w * 0.07, y + h * 0.29);

  context.fillStyle = 'rgba(8, 15, 22, 0.62)';
  fillRoundedRect(context, x + w * 0.06, y + h * 0.8, w * 0.58, h * 0.11, 12, context.fillStyle);
  context.fillStyle = 'rgba(255, 255, 255, 0.08)';
  fillRoundedRect(context, x + w * 0.06, y + h * 0.74, w * 0.48, h * 0.026, 999, context.fillStyle);
  context.fillStyle = accent;
  fillRoundedRect(context, x + w * 0.06, y + h * 0.74, w * 0.48 * clamp((district.development + district.condition) / 2, 0, 1), h * 0.026, 999, context.fillStyle);
  context.fillStyle = '#dbeeff';
  context.fillText(`${Math.round(district.localUnrest)}% unrest`, x + w * 0.09, y + h * 0.865);

  interactiveTargets.push({ kind: 'district', key: district.key, x, y, w, h });
}

function drawUtilities(context, width, height, overlays) {
  const startX = width * 0.62;
  const y = height * 0.08;
  const chipWidth = width * 0.085;

  overlays.forEach((overlay, index) => {
    const x = startX + index * chipWidth;
    fillRoundedRect(context, x, y, chipWidth - 8, height * 0.08, 18, 'rgba(8, 16, 24, 0.7)');
    strokeRoundedRect(context, x, y, chipWidth - 8, height * 0.08, 18, 'rgba(255, 255, 255, 0.08)', 1);
    context.fillStyle = '#dbeeff';
    context.font = `600 ${Math.max(11, width * 0.012)}px "Trebuchet MS", sans-serif`;
    context.fillText(overlay.label, x + 12, y + 20);
    context.fillStyle = overlay.tone === 'good' ? '#9ee2ad' : overlay.tone === 'warn' ? '#ffd37f' : '#ff9f91';
    context.font = `700 ${Math.max(11, width * 0.013)}px "Trebuchet MS", sans-serif`;
    context.fillText(overlay.value, x + 12, y + 40);
  });
}

function drawBackdropCity(context, width, height, palette, skyline) {
  const horizonY = height * 0.35;
  const silhouette = [
    { x: 0.22, w: 0.035, h: 0.08 },
    { x: 0.28, w: 0.05, h: 0.12 },
    { x: 0.36, w: 0.032, h: 0.09 },
    { x: 0.43, w: 0.056, h: 0.15 },
    { x: 0.52, w: 0.04, h: 0.11 },
    { x: 0.58, w: 0.055, h: 0.16 },
    { x: 0.66, w: 0.042, h: 0.1 },
    { x: 0.73, w: 0.032, h: 0.08 },
  ];

  context.fillStyle = 'rgba(14, 22, 31, 0.26)';
  silhouette.forEach((tower, index) => {
    const towerHeight = height * (tower.h + (index % 2) * 0.025 + skyline.towers * 0.0025);
    context.fillRect(width * tower.x, horizonY - towerHeight, width * tower.w, towerHeight);
    context.fillStyle = 'rgba(240, 197, 118, 0.06)';
    for (let windowRow = 0; windowRow < 4; windowRow += 1) {
      context.fillRect(
        width * tower.x + 4,
        horizonY - towerHeight + 6 + windowRow * 10,
        width * tower.w - 8,
        2,
      );
    }
    context.fillStyle = 'rgba(14, 22, 31, 0.26)';
  });

  context.fillStyle = `${palette.glow}`;
  context.fillRect(width * 0.18, horizonY - height * 0.035, width * 0.62, height * 0.05);
}

function drawForegroundCanopy(context, width, height) {
  context.fillStyle = 'rgba(8, 14, 20, 0.22)';
  context.beginPath();
  context.moveTo(width * 0.08, height * 0.92);
  context.bezierCurveTo(width * 0.24, height * 0.84, width * 0.42, height * 0.86, width * 0.58, height * 0.92);
  context.lineTo(width * 0.58, height);
  context.lineTo(width * 0.08, height);
  context.closePath();
  context.fill();

  context.beginPath();
  context.moveTo(width * 0.72, height * 0.9);
  context.bezierCurveTo(width * 0.8, height * 0.84, width * 0.9, height * 0.85, width * 0.98, height * 0.92);
  context.lineTo(width * 0.98, height);
  context.lineTo(width * 0.72, height);
  context.closePath();
  context.fill();
}

function drawMap(context, viewModel, width, height) {
  interactiveTargets = [];
  const { palette, districts, overlays, skyline, stats } = viewModel;
  const sky = context.createLinearGradient(0, 0, 0, height);
  sky.addColorStop(0, palette.skyTop);
  sky.addColorStop(0.42, palette.skyBottom);
  sky.addColorStop(0.421, palette.land);
  sky.addColorStop(1, '#16202a');
  context.fillStyle = sky;
  context.fillRect(0, 0, width, height);

  context.fillStyle = palette.glow;
  context.beginPath();
  context.arc(width * 0.76, height * 0.18, width * 0.12, 0, Math.PI * 2);
  context.fill();

  drawBackdropCity(context, width, height, palette, skyline);
  drawWaterfront(context, width, height, palette);
  drawRoadNetwork(context, width, height);
  districts.forEach((district) => drawDistrict(context, district, width, height));
  districts.forEach((district) => {
    const districtAssets = state.city.assets.filter((asset) => asset.districtKey === district.key);
    districtAssets.forEach((asset, index) => drawAssetMarker(context, asset, district, width, height, index));
  });
  drawUtilities(context, width, height, overlays);

  context.fillStyle = 'rgba(8, 15, 22, 0.65)';
  fillRoundedRect(context, width * 0.03, height * 0.05, width * 0.23, height * 0.12, 22, context.fillStyle);
  context.fillStyle = '#f1f8ff';
  context.font = `700 ${Math.max(14, width * 0.018)}px "Trebuchet MS", sans-serif`;
  context.fillText(`${state.cityName} Grid`, width * 0.05, height * 0.102);
  context.font = `500 ${Math.max(12, width * 0.013)}px "Trebuchet MS", sans-serif`;
  context.fillStyle = 'rgba(219, 238, 255, 0.82)';
  context.fillText(`${stats.season} · Y${state.year} · T${state.turn}`, width * 0.05, height * 0.138);

  context.fillStyle = 'rgba(8, 15, 22, 0.58)';
  fillRoundedRect(context, width * 0.03, height * 0.84, width * 0.26, height * 0.08, 18, context.fillStyle);
  context.fillStyle = '#dbeeff';
  context.font = `600 ${Math.max(11, width * 0.013)}px "Trebuchet MS", sans-serif`;
  context.fillText(state.sim.paused ? 'Paused' : `Live ${currentSpeedOption().label}`, width * 0.05, height * 0.875);
  context.fillText(`ACT ${stats.activityLevel}%`, width * 0.19, height * 0.875);
  context.fillStyle = 'rgba(255, 255, 255, 0.12)';
  fillRoundedRect(context, width * 0.05, height * 0.89, width * 0.2, height * 0.014, 999, context.fillStyle);
  context.fillStyle = state.sim.paused ? '#ffd37f' : '#84dcff';
  fillRoundedRect(context, width * 0.05, height * 0.89, width * 0.2 * state.sim.seasonProgress, height * 0.014, 999, context.fillStyle);

  for (let tower = 0; tower < skyline.towers; tower += 1) {
    const x = width * (0.28 + tower * 0.07);
    const towerHeight = height * (0.07 + (tower % 3) * 0.02);
    context.fillStyle = 'rgba(18, 24, 31, 0.25)';
    context.fillRect(x, height * 0.35 - towerHeight, width * 0.03, towerHeight);
  }

  for (let crane = 0; crane < skyline.cranes; crane += 1) {
    const x = width * (0.4 + crane * 0.12);
    const y = height * 0.62;
    context.strokeStyle = 'rgba(255, 201, 113, 0.6)';
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, y);
    context.lineTo(x, y - height * 0.12);
    context.lineTo(x + width * 0.05, y - height * 0.12);
    context.stroke();
  }

  for (let puff = 0; puff < skyline.smoke; puff += 1) {
    const x = width * (0.72 + puff * 0.03);
    const y = height * (0.47 - puff * 0.015 - ((state.sim.tick + puff * 4) % 18) * 0.0018);
    context.fillStyle = 'rgba(79, 84, 92, 0.16)';
    context.beginPath();
    context.arc(x, y, width * 0.018, 0, Math.PI * 2);
    context.fill();
  }

  drawForegroundCanopy(context, width, height);
}

function paintCityMap() {
  ensureSpriteLibrary();
  const canvas = document.querySelector('[data-city-canvas]');
  if (!canvas) return;

  const context = canvas.getContext('2d');
  const frame = canvas.parentElement;
  if (!context || !frame) return;

  const width = frame.clientWidth;
  const height = frame.clientHeight;
  const dpr = window.devicePixelRatio || 1;

  canvas.width = Math.floor(width * dpr);
  canvas.height = Math.floor(height * dpr);
  canvas.style.width = `${width}px`;
  canvas.style.height = `${height}px`;
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.scale(dpr, dpr);

  drawMap(context, createCityViewModel(), width, height);
}

function speedControlsMarkup() {
  return SPEED_OPTIONS.map((option) => `
    <button class="speed-chip ${option.value === state.sim.speed ? 'is-active' : ''}" type="button" data-speed="${option.value}" ${state.gameOver ? 'disabled' : ''}>${option.label}</button>
  `).join('');
}

function effectSummary(effects) {
  const fragments = [];
  if (effects.housing) fragments.push(`+${effects.housing} housing`);
  if (effects.jobs) fragments.push(`+${effects.jobs} jobs`);
  if (effects.powerSupply) fragments.push(`+${effects.powerSupply} power`);
  if (effects.waterSupply) fragments.push(`+${effects.waterSupply} water`);
  if (effects.serviceSupply) fragments.push(`+${effects.serviceSupply} services`);
  if (effects.food) fragments.push(`+${effects.food} food`);
  if (effects.production) fragments.push(`+${effects.production} production`);
  if (effects.revenueBase) fragments.push(`+${effects.revenueBase} trade`);
  if (effects.powerDemand) fragments.push(`+${effects.powerDemand} load`);
  return fragments.slice(0, 3).join(' · ');
}

function selectionMatches(kind, key) {
  return state.ui.selection.kind === kind && state.ui.selection.key === key;
}

function hoverMatches(kind, key) {
  return state.ui.hoveredTarget?.kind === kind && state.ui.hoveredTarget?.key === key;
}

function assetActionKey(asset) {
  if (!asset) return null;
  if (['north-terraces', 'south-crossings'].includes(asset.key)) return 'housing';
  if (asset.key === 'harbor-grid') return 'grid';
  if (asset.key === 'industry-foundry') return 'industry';
  if (asset.key === 'civic-hall') return 'services';
  return null;
}

function actionLabel(key) {
  return actions.find((action) => action.key === key)?.label ?? key;
}

function assetAnchor(district, index = 0) {
  const anchors = [
    { x: 0.8, y: 0.3 },
    { x: 0.24, y: 0.72 },
  ];
  const anchor = anchors[index % anchors.length];
  return {
    x: district.x + district.w * anchor.x,
    y: district.y + district.h * anchor.y,
  };
}

function drawAssetMarker(context, asset, district, width, height, index) {
  const anchor = assetAnchor(district, index);
  const x = anchor.x * width;
  const y = anchor.y * height;
  const radius = Math.max(16, width * 0.016);
  const selected = selectionMatches('asset', asset.key);
  const hovered = hoverMatches('asset', asset.key);
  const tone = assetActionKey(asset);
  const districtGlow = districtAccent(district.type);
  const fill =
    tone === 'housing' ? 'rgba(152, 226, 166, 0.86)'
    : tone === 'grid' ? 'rgba(117, 214, 255, 0.84)'
    : tone === 'industry' ? 'rgba(255, 213, 138, 0.84)'
    : 'rgba(234, 241, 255, 0.84)';

  context.strokeStyle = `${districtGlow}44`;
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(x, y - radius * 1.5);
  context.lineTo(x, y - radius * 0.25);
  context.stroke();

  if (selected) {
    context.fillStyle = `${districtGlow}22`;
    context.beginPath();
    context.arc(x, y - radius * 1.6, radius * 0.9, 0, Math.PI * 2);
    context.fill();
  }

  context.save();
  context.translate(x, y);
  context.rotate(Math.PI / 4);
  context.fillStyle = 'rgba(5, 10, 15, 0.92)';
  fillRoundedRect(context, -radius - 7, -radius - 7, (radius + 7) * 2, (radius + 7) * 2, 8, context.fillStyle);
  context.fillStyle = fill;
  fillRoundedRect(context, -radius - 2, -radius - 2, (radius + 2) * 2, (radius + 2) * 2, 7, context.fillStyle);
  context.restore();

  const icon = ASSET_ICON_SPRITES[asset.key];
  const iconImage = icon ? spriteLibrary.images[icon.sheet] : null;
  if (icon && iconImage) {
    drawSpriteRegion(context, iconImage, icon.region, x - radius * 0.8, y - radius * 1.02, radius * 1.6, radius * 1.35, 0.98);
  } else {
    context.fillStyle = '#02131b';
    context.beginPath();
    context.arc(x, y - 1, radius * 0.45, 0, Math.PI * 2);
    context.fill();
  }

  if (selected || hovered) {
    context.strokeStyle = selected ? districtGlow : 'rgba(255, 255, 255, 0.7)';
    context.lineWidth = selected ? 3 : 2;
    context.beginPath();
    context.arc(x, y, radius + 7, 0, Math.PI * 2);
    context.stroke();
    if (selected) {
      context.strokeStyle = `${districtGlow}66`;
      context.setLineDash([5, 6]);
      context.beginPath();
      context.arc(x, y, radius + 13 + (state.sim.tick % 12) * 0.35, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
    }
  }

  context.fillStyle = '#02131b';
  context.font = `700 ${Math.max(11, width * 0.011)}px "Trebuchet MS", sans-serif`;
  context.textAlign = 'center';
  context.fillText(`L${asset.level}`, x, y + radius * 1.05);
  context.textAlign = 'left';

  interactiveTargets.push({
    kind: 'asset',
    key: asset.key,
    x: x - radius - 8,
    y: y - radius - 8,
    w: (radius + 8) * 2,
    h: (radius + 8) * 2,
  });
}

function selectedEntity() {
  if (state.ui.selection.kind === 'asset') {
    const asset = getAssetByKey(state.ui.selection.key);
    const district = asset ? getDistrictByKey(asset.districtKey) : null;
    return { kind: 'asset', asset, district };
  }

  const district = getDistrictByKey(state.ui.selection.key);
  return { kind: 'district', district, asset: null };
}

function inspectorMarkup() {
  const systems = state.city.systems;
  const selection = selectedEntity();

  if (selection.kind === 'asset' && selection.asset && selection.district) {
    const actionKey = assetActionKey(selection.asset);
    const effects = resolveAssetEffects(selection.asset);
    return `
      <section class="floating-panel inspector" aria-label="Selection panel">
        <div class="panel-head">
          <span class="panel-kicker">City Asset</span>
          <div class="panel-title-row">
            <strong>${selection.asset.label}</strong>
            <span class="status-pill">L${selection.asset.level}/${selection.asset.maxLevel}</span>
          </div>
          <p class="panel-status">${selection.district.label} relies on this node for ${effectSummary(effects) || 'local support'}.</p>
        </div>
        <div class="fact-grid">
          <div class="fact-chip"><span>District</span><strong>${selection.district.label}</strong></div>
          <div class="fact-chip"><span>Growth</span><strong>${selection.district.growthTrend > 0 ? '+' : ''}${selection.district.growthTrend.toFixed(1)}</strong></div>
          <div class="fact-chip"><span>Unrest</span><strong>${Math.round(selection.district.localUnrest)}%</strong></div>
          <div class="fact-chip"><span>Effect</span><strong>${effectSummary(effects) || 'Support'}</strong></div>
        </div>
        <div class="panel-actions">
          <button class="action-chip is-primary" type="button" data-build="${actionKey}" ${!actionKey || state.actionsLeft <= 0 || state.gameOver || selection.asset.level >= selection.asset.maxLevel ? 'disabled' : ''}>
            <strong>${selection.asset.level >= selection.asset.maxLevel ? 'Maxed' : `Upgrade via ${actionLabel(actionKey)}`}</strong>
            <span>${selection.asset.level >= selection.asset.maxLevel ? 'Select another asset to keep building.' : `${selection.asset.label} upgrades directly from the map selection.`}</span>
          </button>
          <button class="action-chip" type="button" data-select-district="${selection.district.key}">
            <strong>Inspect district</strong>
            <span>Return to ${selection.district.label}.</span>
          </button>
        </div>
        <div class="mini-grid">
          <div class="mini-card"><span class="mini-label">Power</span><strong>${systems.utilities.power.coveragePercent}%</strong></div>
          <div class="mini-card"><span class="mini-label">Water</span><strong>${systems.utilities.water.coveragePercent}%</strong></div>
        </div>
      </section>
    `;
  }

  const district = selection.district ?? getDistrictByKey('civic');
  const districtAssets = state.city.assets.filter((asset) => asset.districtKey === district.key);

  return `
    <section class="floating-panel inspector" aria-label="Selection panel">
      <div class="panel-head">
        <span class="panel-kicker">District</span>
        <div class="panel-title-row">
          <strong>${district.label}</strong>
          <span class="status-pill">${district.status}</span>
        </div>
        <p class="panel-status">${Math.round(district.residents)} housed, ${Math.round(district.jobsFilled)} jobs filled, development ${Math.round(district.development * 100)}%.</p>
      </div>
      <div class="fact-grid">
        <div class="fact-chip"><span>Growth</span><strong>${district.growthTrend > 0 ? '+' : ''}${district.growthTrend.toFixed(1)}</strong></div>
        <div class="fact-chip"><span>Utility</span><strong>${Math.round(district.metrics.utilityLoad * 100)}%</strong></div>
        <div class="fact-chip"><span>Services</span><strong>${Math.round(district.metrics.servicePressure * 100)}%</strong></div>
        <div class="fact-chip"><span>Unrest</span><strong>${Math.round(district.localUnrest)}%</strong></div>
      </div>
      <div class="panel-actions">
        ${actions.map((action) => `
          <button class="action-chip ${selectedAssetForAction(action.key) ? 'is-primary' : ''}" type="button" data-build="${action.key}" ${state.actionsLeft <= 0 || state.gameOver ? 'disabled' : ''}>
            <strong>${action.label}</strong>
            <span>${action.note}</span>
          </button>
        `).join('')}
      </div>
      <div class="mini-grid">
        ${districtAssets.map((asset) => `
          <button class="mini-card mini-card-button" type="button" data-select-asset="${asset.key}">
            <span class="mini-label">${asset.label}</span>
            <strong>L${asset.level}/${asset.maxLevel}</strong>
          </button>
        `).join('')}
      </div>
    </section>
  `;
}

function render() {
  const resources = state.city.resources;
  const systems = state.city.systems;
  const viewModel = createCityViewModel();
  const modeClass = state.gameOver ? 'status-danger' : state.sim.paused ? 'status-paused' : 'status-live';
  const selected = selectedEntity();
  const selectedLabel =
    selected.kind === 'asset' && selected.asset ? selected.asset.label
    : selected.district?.label ?? 'Civic Core';

  app.innerHTML = `
    <main class="app-shell">
      <section class="game-shell">
        <div class="city-stage">
          <div class="city-map-frame">
            <canvas data-city-canvas aria-label="Interactive city canvas with districts and upgrade assets"></canvas>
          </div>
          <div class="stage-overlay">
            <div class="overlay-column">
              <section class="floating-panel hud" aria-label="City HUD">
                <div class="hud-title">
                  <span class="hud-kicker">Minimal City Builder</span>
                  <strong>${state.cityName}</strong>
                  <div class="hud-subline">
                    <span class="capsule ${modeClass}"><span class="chip-icon">${state.sim.paused ? '||' : '>>'}</span><strong>${state.gameOver ? 'Collapse' : state.sim.paused ? 'Paused' : `Live ${currentSpeedOption().label}`}</strong></span>
                    <span class="capsule"><span class="chip-icon">Y</span><strong>${currentSeason()} · ${state.year}</strong></span>
                    <span class="capsule"><span class="chip-icon">A</span><strong>${state.actionsLeft}/${ACTION_LIMIT}</strong></span>
                  </div>
                </div>
                <div class="hud-stats">
                  <span class="stat-chip"><span class="chip-icon">P</span><span class="chip-label">Pop</span><strong>${Math.round(resources.population)}</strong></span>
                  <span class="stat-chip"><span class="chip-icon">$</span><span class="chip-label">Treasury</span><strong>${Math.round(resources.treasury)}</strong></span>
                  <span class="stat-chip"><span class="chip-icon">S</span><span class="chip-label">Satisfaction</span><strong>${Math.round(systems.mood.satisfaction)}%</strong></span>
                  <span class="stat-chip"><span class="chip-icon">U</span><span class="chip-label">Unrest</span><strong>${Math.round(resources.unrest)}%</strong></span>
                </div>
              </section>

              <div class="stage-bottom">
                <section class="floating-panel toolbar" aria-label="City controls">
                  <div class="toolbar-row">
                    <span class="toolbar-label">Build</span>
                    <div class="toolbar-group">
                      ${actions.map((action) => `
                        <button class="toolbar-button is-build" type="button" data-build="${action.key}" ${state.actionsLeft <= 0 || state.gameOver ? 'disabled' : ''}>
                          <strong>${action.label}</strong>
                        </button>
                      `).join('')}
                    </div>
                  </div>
                  <div class="toolbar-row">
                    <button class="toolbar-toggle ${state.sim.paused ? 'is-primary' : ''}" type="button" data-action="toggle-pause" ${state.gameOver ? 'disabled' : ''}>${state.sim.paused ? 'Resume' : 'Pause'}</button>
                    <button class="toolbar-toggle" type="button" data-action="advance" ${state.gameOver ? 'disabled' : ''}>Next</button>
                    <button class="toolbar-toggle" type="button" data-action="reset">Reset</button>
                    <div class="speed-track">${speedControlsMarkup()}</div>
                  </div>
                </section>

                <section class="floating-panel ticker" aria-label="System ticker">
                  <div class="ticker-row">
                    <span class="ticker-dot"></span>
                    <strong>Selected</strong>
                    <span>${selectedLabel}</span>
                  </div>
                  <div class="ticker-row">
                    <span class="ticker-dot"></span>
                    <span>Housing ${Math.round(systems.housing.capacity)} / ${Math.round(resources.population)} · Power ${systems.utilities.power.coveragePercent}% · Transit ${systems.utilities.transit.loadPercent}%</span>
                  </div>
                  <div class="ticker-row">
                    <span class="ticker-dot"></span>
                    <span>${state.log[0]}</span>
                  </div>
                </section>
              </div>
            </div>

            <div class="inspector-column">
              ${inspectorMarkup()}
            </div>
          </div>
        </div>
      </section>
    </main>
  `;

  paintCityMap();

  const canvas = document.querySelector('[data-city-canvas]');
  if (!canvas) return;

  canvas.addEventListener('pointermove', (event) => {
    const point = canvasPoint(event, canvas);
    const hit = hitTestCanvas(point);
    const next = hit ? { kind: hit.kind, key: hit.key } : null;
    if ((next?.kind ?? null) === (state.ui.hoveredTarget?.kind ?? null) && (next?.key ?? null) === (state.ui.hoveredTarget?.key ?? null)) {
      return;
    }
    state.ui.hoveredTarget = next;
    paintCityMap();
  });

  canvas.addEventListener('pointerleave', () => {
    if (!state.ui.hoveredTarget) return;
    state.ui.hoveredTarget = null;
    paintCityMap();
  });

  canvas.addEventListener('click', (event) => {
    const point = canvasPoint(event, canvas);
    const hit = hitTestCanvas(point);
    if (!hit) return;
    if (hit.kind === 'asset') selectAsset(hit.key);
    if (hit.kind === 'district') selectDistrict(hit.key);
  });
}

function simulationFrame(timestamp) {
  if (!state.sim.lastFrameMs) {
    state.sim.lastFrameMs = timestamp;
  }

  const elapsed = timestamp - state.sim.lastFrameMs;
  state.sim.lastFrameMs = timestamp;

  if (!state.sim.paused && !state.gameOver) {
    state.sim.accumulatorMs += elapsed;
    const stepMs = currentTickMs();

    while (state.sim.accumulatorMs >= stepMs && !state.gameOver && !state.sim.paused) {
      state.sim.accumulatorMs -= stepMs;
      tickCity();
    }
  }

  frameHandle = window.requestAnimationFrame(simulationFrame);
}

function canvasPoint(event, canvas) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: event.clientX - rect.left,
    y: event.clientY - rect.top,
  };
}

function hitTestCanvas(point) {
  return [...interactiveTargets].reverse().find((target) => (
    point.x >= target.x
    && point.x <= target.x + target.w
    && point.y >= target.y
    && point.y <= target.y + target.h
  )) ?? null;
}

window.addEventListener('resize', () => {
  if (resizeQueued) return;
  resizeQueued = true;
  window.requestAnimationFrame(() => {
    resizeQueued = false;
    paintCityMap();
  });
});

app.addEventListener('click', (event) => {
  const button = event.target.closest('button');
  if (button) {
    const { action, build, speed, selectDistrict: districtKey, selectAsset: assetKey } = button.dataset;
    if (action === 'advance') rushSeason();
    if (action === 'toggle-pause') togglePause();
    if (action === 'reset') {
      state = createInitialState();
      normalizeState();
      render();
    }
    if (build) applyAction(build);
    if (speed) setSpeed(Number(speed));
    if (districtKey) selectDistrict(districtKey);
    if (assetKey) selectAsset(assetKey);
  }
});

window.citySimState = {
  getSnapshot() {
    return structuredClone(state);
  },
};

window.citySimUI = {
  getState() {
    return structuredClone(state);
  },
  setState(nextState) {
    state = mergeState(state, nextState);
    normalizeState();
    render();
  },
  render,
  pause() {
    togglePause(true);
  },
  resume() {
    togglePause(false);
  },
  setSpeed,
  selectDistrict,
  selectAsset,
};

normalizeState();
syncAlerts();
render();
frameHandle = window.requestAnimationFrame(simulationFrame);
