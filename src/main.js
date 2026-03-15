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
  { key: 'civic', label: 'Civic Core', type: 'civic', x: 0.38, y: 0.16, w: 0.24, h: 0.21 },
  { key: 'north', label: 'North Steps', type: 'residential', x: 0.64, y: 0.1, w: 0.22, h: 0.24 },
  { key: 'harbor', label: 'Rivergate', type: 'utility', x: 0.12, y: 0.14, w: 0.18, h: 0.27 },
  { key: 'market', label: 'Market Spine', type: 'commercial', x: 0.39, y: 0.41, w: 0.24, h: 0.19 },
  { key: 'park', label: 'Green Loop', type: 'park', x: 0.14, y: 0.47, w: 0.22, h: 0.26 },
  { key: 'industry', label: 'Ironworks', type: 'industrial', x: 0.67, y: 0.44, w: 0.19, h: 0.24 },
  { key: 'south', label: 'South Reach', type: 'mixed', x: 0.39, y: 0.65, w: 0.24, h: 0.19 },
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
let resizeQueued = false;
let frameHandle = 0;

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
    const asset = selectedHousingAsset();
    if (asset) {
      const cost = 22 + asset.level * 6;
      applied = upgradeAsset(asset.key, cost);
      if (applied) {
        logEvent(`${asset.label} expands in ${getDistrictByKey(asset.districtKey)?.label}. More housing comes online, but service demand rises too.`);
      }
    }
  }

  if (type === 'grid') {
    const asset = getAssetByKey('harbor-grid');
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
    const asset = getAssetByKey('industry-foundry');
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
    const asset = getAssetByKey('civic-hall');
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
  }));

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

function districtColor(type) {
  const colors = {
    civic: ['#7ad4ff', '#295f7f'],
    residential: ['#8fe0d0', '#264d4b'],
    utility: ['#6bc4eb', '#1f435d'],
    commercial: ['#ffd57c', '#6d5130'],
    industrial: ['#f19e65', '#633d21'],
    park: ['#85c983', '#284d31'],
    mixed: ['#d79eff', '#5c3b67'],
  };

  return colors[type] ?? colors.mixed;
}

function drawRoadNetwork(context, width, height) {
  const roads = [
    [0.2, 0.18, 0.2, 0.86],
    [0.38, 0.14, 0.38, 0.88],
    [0.62, 0.12, 0.62, 0.9],
    [0.82, 0.16, 0.82, 0.86],
    [0.08, 0.34, 0.92, 0.34],
    [0.1, 0.56, 0.9, 0.56],
    [0.12, 0.77, 0.88, 0.77],
  ];

  context.lineCap = 'round';
  context.strokeStyle = 'rgba(190, 222, 240, 0.22)';
  context.lineWidth = Math.max(6, width * 0.01);
  roads.forEach(([x1, y1, x2, y2]) => {
    context.beginPath();
    context.moveTo(x1 * width, y1 * height);
    context.lineTo(x2 * width, y2 * height);
    context.stroke();
  });

  context.setLineDash([10, 12]);
  context.strokeStyle = 'rgba(255, 244, 196, 0.28)';
  context.lineWidth = Math.max(1.2, width * 0.002);
  roads.forEach(([x1, y1, x2, y2]) => {
    context.beginPath();
    context.moveTo(x1 * width, y1 * height);
    context.lineTo(x2 * width, y2 * height);
    context.stroke();
  });
  context.setLineDash([]);
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
}

function drawDistrictBuildings(context, district, frame) {
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
        context.fillStyle = 'rgba(66, 44, 28, 0.9)';
        context.fillRect(x + cellWidth * 0.45, y + buildingHeight * 0.55, cellWidth * 0.1, buildingHeight * 0.45);
        continue;
      }

      const alpha = district.type === 'utility' ? 0.88 : 0.94;
      context.fillStyle = `rgba(17, 25, 32, ${alpha})`;
      fillRoundedRect(context, x, y, cellWidth, buildingHeight, Math.max(4, frame.w * 0.01), context.fillStyle);

      const windowRows = Math.max(2, Math.floor(buildingHeight / 16));
      const windowCols = Math.max(2, Math.floor(cellWidth / 10));
      const lit = district.type === 'industrial' ? 'rgba(255, 188, 104, 0.52)' : 'rgba(174, 229, 255, 0.52)';

      for (let windowRow = 0; windowRow < windowRows; windowRow += 1) {
        for (let windowCol = 0; windowCol < windowCols; windowCol += 1) {
          if ((windowRow + windowCol + seed + state.sim.tick) % 3 === 0) continue;
          const wx = x + cellWidth * 0.16 + windowCol * ((cellWidth * 0.68) / windowCols);
          const wy = y + buildingHeight * 0.1 + windowRow * ((buildingHeight * 0.72) / windowRows);
          context.fillStyle = lit;
          context.fillRect(wx, wy, Math.max(1.6, cellWidth * 0.08), Math.max(1.8, buildingHeight * 0.04));
        }
      }

      if (district.type === 'utility' && col === columns - 1) {
        context.strokeStyle = 'rgba(149, 233, 255, 0.65)';
        context.lineWidth = 2;
        context.beginPath();
        context.moveTo(x + cellWidth * 0.5, y);
        context.lineTo(x + cellWidth * 0.5, y - frame.h * 0.12);
        context.stroke();
      }
    }
  }
}

function drawDistrict(context, district, width, height) {
  const x = district.x * width;
  const y = district.y * height;
  const w = district.w * width;
  const h = district.h * height;
  const [fill, shade] = districtColor(district.type);
  const gradient = context.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, fill);
  gradient.addColorStop(1, shade);

  fillRoundedRect(context, x, y, w, h, Math.max(16, width * 0.018), gradient);
  strokeRoundedRect(
    context,
    x,
    y,
    w,
    h,
    Math.max(16, width * 0.018),
    district.growthTone === 'good' ? 'rgba(158, 226, 173, 0.74)' : district.growthTone === 'danger' ? 'rgba(255, 159, 145, 0.78)' : 'rgba(255, 255, 255, 0.14)',
    district.growthTone === 'warn' ? 1.2 : 2,
  );

  context.fillStyle = 'rgba(255, 255, 255, 0.05)';
  fillRoundedRect(context, x + w * 0.04, y + h * 0.06, w * 0.92, h * 0.88, Math.max(12, width * 0.015), context.fillStyle);

  drawDistrictBuildings(context, district, { x: x + w * 0.05, y: y + h * 0.18, w: w * 0.9, h: h * 0.72 });

  const selection = state.ui.selection.kind === 'district' && state.ui.selection.key === district.key;
  if (selection) {
    strokeRoundedRect(context, x - 4, y - 4, w + 8, h + 8, Math.max(18, width * 0.02), '#f4fbff', 2.5);
  }

  context.fillStyle = '#f5fbff';
  context.font = `600 ${Math.max(12, width * 0.018)}px "Trebuchet MS", sans-serif`;
  context.fillText(district.label, x + w * 0.07, y + h * 0.16);

  context.fillStyle = district.utilityTone === 'good' ? '#9ee2ad' : district.utilityTone === 'warn' ? '#ffd37f' : '#ff9f91';
  context.font = `500 ${Math.max(10, width * 0.013)}px "Trebuchet MS", sans-serif`;
  context.fillText(district.status, x + w * 0.07, y + h * 0.26);

  context.fillStyle = 'rgba(8, 15, 22, 0.55)';
  fillRoundedRect(context, x + w * 0.06, y + h * 0.78, w * 0.42, h * 0.13, 12, context.fillStyle);
  context.fillStyle = '#dbeeff';
  context.fillText(`${Math.round(district.localUnrest)}% unrest`, x + w * 0.09, y + h * 0.865);
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

function drawMap(context, viewModel, width, height) {
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

  drawWaterfront(context, width, height, palette);
  drawRoadNetwork(context, width, height);
  districts.forEach((district) => drawDistrict(context, district, width, height));
  drawUtilities(context, width, height, overlays);

  context.fillStyle = 'rgba(8, 15, 22, 0.65)';
  fillRoundedRect(context, width * 0.03, height * 0.05, width * 0.25, height * 0.15, 22, context.fillStyle);
  context.fillStyle = '#f1f8ff';
  context.font = `700 ${Math.max(14, width * 0.021)}px "Trebuchet MS", sans-serif`;
  context.fillText(`${state.cityName} Systems Map`, width * 0.05, height * 0.105);
  context.font = `500 ${Math.max(12, width * 0.014)}px "Trebuchet MS", sans-serif`;
  context.fillStyle = 'rgba(219, 238, 255, 0.82)';
  context.fillText(`${stats.season} · Year ${state.year} · Turn ${state.turn}`, width * 0.05, height * 0.145);
  context.fillText(`Population ${stats.population} · Treasury ${stats.treasury} · Satisfaction ${stats.satisfaction}%`, width * 0.05, height * 0.175);

  context.fillStyle = 'rgba(8, 15, 22, 0.58)';
  fillRoundedRect(context, width * 0.03, height * 0.82, width * 0.28, height * 0.1, 18, context.fillStyle);
  context.fillStyle = '#dbeeff';
  context.font = `600 ${Math.max(11, width * 0.013)}px "Trebuchet MS", sans-serif`;
  context.fillText(state.sim.paused ? 'Simulation paused' : `Live at ${currentSpeedOption().label}`, width * 0.05, height * 0.865);
  context.fillText(`Activity ${stats.activityLevel}%`, width * 0.18, height * 0.865);
  context.fillText(`Unrest ${stats.unrest}%`, width * 0.05, height * 0.897);
  context.fillStyle = 'rgba(255, 255, 255, 0.12)';
  fillRoundedRect(context, width * 0.05, height * 0.905, width * 0.22, height * 0.014, 999, context.fillStyle);
  context.fillStyle = state.sim.paused ? '#ffd37f' : '#84dcff';
  fillRoundedRect(context, width * 0.05, height * 0.905, width * 0.22 * state.sim.seasonProgress, height * 0.014, 999, context.fillStyle);

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
    const y = height * (0.47 - puff * 0.015);
    context.fillStyle = 'rgba(79, 84, 92, 0.16)';
    context.beginPath();
    context.arc(x, y, width * 0.018, 0, Math.PI * 2);
    context.fill();
  }
}

function paintCityMap() {
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

function demandMarkup(viewModel) {
  return Object.entries(viewModel.demand).map(([key, value]) => `
    <div class="demand-row">
      <span>${key}</span>
      <div class="demand-meter"><i style="width:${value * 10}%"></i></div>
      <strong>${value}/10</strong>
    </div>
  `).join('');
}

function districtCardsMarkup(viewModel) {
  return viewModel.districts.map((district) => `
    <button class="district-card district-card-${district.type} ${state.ui.selection.kind === 'district' && state.ui.selection.key === district.key ? 'is-selected' : ''}" type="button" data-select-district="${district.key}">
      <header>
        <strong>${district.label}</strong>
        <span>${district.status}</span>
      </header>
      <p>${Math.round(district.residents)}/${Math.round(district.metrics.housingCapacity || 0)} housed · ${Math.round(district.jobsFilled)}/${Math.round(district.metrics.jobsCapacity || 0)} jobs filled</p>
      <div class="district-mini-metrics">
        <span>Growth ${district.growthTrend > 0 ? '+' : ''}${district.growthTrend.toFixed(1)}</span>
        <span>Utility ${Math.round(district.metrics.utilityLoad * 100)}%</span>
        <span>Unrest ${Math.round(district.localUnrest)}%</span>
      </div>
    </button>
  `).join('');
}

function speedControlsMarkup() {
  return SPEED_OPTIONS.map((option) => `
    <button class="button speed-button ${option.value === state.sim.speed ? 'is-active' : ''}" type="button" data-speed="${option.value}" ${state.gameOver ? 'disabled' : ''}>${option.label}</button>
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

function selectedDetailMarkup() {
  const selection = state.ui.selection;
  if (selection.kind === 'asset') {
    const asset = getAssetByKey(selection.key);
    if (!asset) return '';
    const district = getDistrictByKey(asset.districtKey);
    const effects = resolveAssetEffects(asset);
    return `
      <section class="control-group">
        <h3>Selected Asset</h3>
        <div class="selection-detail">
          <div class="selection-header">
            <strong>${asset.label}</strong>
            <span>Level ${asset.level}/${asset.maxLevel}</span>
          </div>
          <div class="detail-grid">
            <div class="detail-cell"><span>District</span><strong>${district?.label ?? 'Unknown'}</strong></div>
            <div class="detail-cell"><span>Effect</span><strong>${effectSummary(effects) || 'Support asset'}</strong></div>
            <div class="detail-cell"><span>Upkeep load</span><strong>${effects.upkeep ? `+${effects.upkeep}` : 'Low'}</strong></div>
            <div class="detail-cell"><span>Integration</span><strong>${district?.status ?? 'Stable'}</strong></div>
          </div>
          <div class="asset-chip-row">
            <button class="asset-chip" type="button" data-select-district="${asset.districtKey}">View district</button>
          </div>
        </div>
      </section>
    `;
  }

  const district = getDistrictByKey(selection.key);
  if (!district) return '';
  const districtAssets = state.city.assets.filter((asset) => asset.districtKey === district.key);
  return `
    <section class="control-group">
      <h3>Selected District</h3>
      <div class="selection-detail">
        <div class="selection-header">
          <strong>${district.label}</strong>
          <span>${district.status}</span>
        </div>
        <div class="detail-grid">
          <div class="detail-cell"><span>Residents</span><strong>${Math.round(district.residents)} / ${Math.round(district.metrics.housingCapacity || 0)}</strong></div>
          <div class="detail-cell"><span>Jobs filled</span><strong>${Math.round(district.jobsFilled)} / ${Math.round(district.metrics.jobsCapacity || 0)}</strong></div>
          <div class="detail-cell"><span>Growth</span><strong>${district.growthTrend > 0 ? '+' : ''}${district.growthTrend.toFixed(1)}</strong></div>
          <div class="detail-cell"><span>Local unrest</span><strong>${Math.round(district.localUnrest)}%</strong></div>
          <div class="detail-cell"><span>Utility load</span><strong>${Math.round(district.metrics.utilityLoad * 100)}%</strong></div>
          <div class="detail-cell"><span>Service pressure</span><strong>${Math.round(district.metrics.servicePressure * 100)}%</strong></div>
          <div class="detail-cell"><span>Development</span><strong>${Math.round(district.development * 100)}%</strong></div>
          <div class="detail-cell"><span>Condition</span><strong>${Math.round(district.condition * 100)}%</strong></div>
        </div>
        <div class="asset-chip-row">
          ${districtAssets.map((asset) => `
            <button class="asset-chip ${state.ui.selection.kind === 'asset' && state.ui.selection.key === asset.key ? 'is-selected' : ''}" type="button" data-select-asset="${asset.key}">
              ${asset.label} · L${asset.level}
            </button>
          `).join('')}
        </div>
      </div>
    </section>
  `;
}

function render() {
  const resources = state.city.resources;
  const systems = state.city.systems;
  const viewModel = createCityViewModel();
  const simState = state.gameOver ? 'Collapse' : state.sim.paused ? 'Paused' : 'Running';
  const progressPercent = Math.round(state.sim.seasonProgress * 100);
  const utilityCoverage = Math.min(systems.utilities.power.coverage, systems.utilities.water.coverage);

  app.innerHTML = `
    <main class="shell">
      <section class="topbar panel">
        <div class="topbar-title">
          <p class="eyebrow">City Command Board</p>
          <h1>${state.cityName}</h1>
          <p class="topbar-copy">The surface stays minimal, but the city underneath now moves through housing demand, utility load, service pressure, production, unrest, and district growth on its own.</p>
        </div>
        <div class="topbar-meta">
          <div class="meta-pill">
            <span>Simulation</span>
            <strong>${simState} · ${currentSpeedOption().label}</strong>
            <p>${state.gameOver ? 'The city charter failed and ticking has stopped.' : `${state.actionsLeft} interventions left before ${nextSeason()}.`}</p>
          </div>
          <div class="meta-pill">
            <span>Clock</span>
            <strong>${currentSeason()} · Year ${state.year}</strong>
            <p>${progressPercent}% through the season, ${state.sim.tick} ticks processed, ${systems.summary.alerts} active pressure signals.</p>
          </div>
          <div class="meta-actions">
            <button class="button button-primary" type="button" data-action="toggle-pause" ${state.gameOver ? 'disabled' : ''}>${state.sim.paused ? 'Resume Simulation' : 'Pause Simulation'}</button>
            <button class="button button-secondary" type="button" data-action="advance" ${state.gameOver ? 'disabled' : ''}>Rush To Next Season</button>
            <button class="button button-secondary" type="button" data-action="reset">Restart Charter</button>
          </div>
          <div class="sim-controls" role="group" aria-label="Simulation speed">
            <span class="sim-pill ${state.sim.paused ? 'is-paused' : 'is-live'}">${state.sim.paused ? 'Paused' : `Live ${currentSpeedOption().label}`}</span>
            ${speedControlsMarkup()}
          </div>
        </div>
      </section>

      <section class="summary-grid" aria-label="City summary">
        <article class="summary-card panel accent-cyan ${resourceTone('population', resources.population)}">
          <p>Population</p><strong>${Math.round(resources.population)}</strong><span>Residents respond to available housing, jobs, utilities, and civic mood.</span>
        </article>
        <article class="summary-card panel accent-amber ${resourceTone('food', resources.food)}">
          <p>Food Reserve</p><strong>${Math.round(resources.food)}</strong><span>${Math.round(systems.food.production)} produced vs ${Math.round(systems.food.demand)} consumed each tick window.</span>
        </article>
        <article class="summary-card panel accent-green ${resourceTone('treasury', resources.treasury)}">
          <p>Treasury</p><strong>${Math.round(resources.treasury)}</strong><span>${Math.round(systems.economy.revenue)} revenue against ${Math.round(systems.economy.upkeep)} upkeep.</span>
        </article>
        <article class="summary-card panel accent-rose ${resourceTone('satisfaction', systems.mood.satisfaction)}">
          <p>Satisfaction</p><strong>${Math.round(systems.mood.satisfaction)}%</strong><span>Utility coverage ${Math.round(utilityCoverage * 100)}%, unrest ${Math.round(resources.unrest)}%, employment ${systems.economy.employmentPercent}%.</span>
        </article>
      </section>

      <section class="workspace">
        <section class="map-panel panel" aria-labelledby="city-map-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Regional View</p>
              <h2 id="city-map-title">Graphical City Map</h2>
            </div>
            <div class="section-pills">
              <span class="board-tag">${state.actionsLeft} actions left</span>
              <span class="board-tag">Employment ${systems.economy.employmentPercent}%</span>
              <span class="board-tag">Next: ${nextSeason()}</span>
            </div>
          </div>
          <div class="city-map-frame">
            <canvas data-city-canvas aria-label="Canvas map showing district growth, utilities, unrest, and activity across the simulated city"></canvas>
          </div>
          <div class="map-footer">
            <div class="board-legend" aria-label="Map legend">
              <span><i class="swatch swatch-road"></i> Road grid</span>
              <span><i class="swatch swatch-civic"></i> Civic / mixed core</span>
              <span><i class="swatch swatch-housing"></i> Housing</span>
              <span><i class="swatch swatch-industry"></i> Industry</span>
              <span><i class="swatch swatch-green"></i> Parks / farms</span>
              <span><i class="swatch swatch-utility"></i> Utilities</span>
            </div>
            <div class="demand-panel">
              <h3>Pressure Map</h3>
              ${demandMarkup(viewModel)}
            </div>
          </div>
        </section>

        <aside class="sidebar panel" aria-labelledby="control-panel-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Operations</p>
              <h2 id="control-panel-title">City Systems</h2>
            </div>
          </div>

          <div class="control-stack">
            <section class="control-group">
              <h3>Season Actions</h3>
              ${actions.map((action) => `
                <button class="button control-button" type="button" data-build="${action.key}" ${state.actionsLeft <= 0 || state.gameOver ? 'disabled' : ''}>
                  <strong>${action.label}</strong>
                  <span>${action.note}</span>
                </button>
              `).join('')}
            </section>

            <section class="control-group district-stack">
              <h3>District Readout</h3>
              ${districtCardsMarkup(viewModel)}
            </section>

            ${selectedDetailMarkup()}

            <section class="control-group">
              <h3>Simulation State</h3>
              <div class="status-row"><span>Housing</span><strong>${Math.round(systems.housing.capacity)} cap / ${Math.round(systems.housing.shortage)} shortage</strong></div>
              <div class="status-row"><span>Power coverage</span><strong>${systems.utilities.power.coveragePercent}%</strong></div>
              <div class="status-row"><span>Water coverage</span><strong>${systems.utilities.water.coveragePercent}%</strong></div>
              <div class="status-row"><span>Transit load</span><strong>${systems.utilities.transit.loadPercent}%</strong></div>
              <div class="status-row"><span>Services</span><strong>${systems.services.coveragePercent}%</strong></div>
              <div class="status-row"><span>Growth / decline</span><strong>${systems.pressure.growth.toFixed(1)} / ${systems.pressure.decline.toFixed(1)}</strong></div>
              <div class="status-row"><span>UI bridge</span><strong>window.citySimUI</strong></div>
              <div class="status-row"><span>State snapshot</span><strong>window.citySimState</strong></div>
            </section>

            <section class="control-group">
              <h3>Founding Chronicle</h3>
              <ul class="advisory-list log">
                ${state.log.map((entry) => `<li>${entry}</li>`).join('')}
              </ul>
            </section>
          </div>
        </aside>
      </section>
    </main>
  `;

  paintCityMap();
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

function pickDistrictAtPoint(clientX, clientY) {
  const canvas = document.querySelector('[data-city-canvas]');
  if (!canvas) return null;
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) / rect.width;
  const y = (clientY - rect.top) / rect.height;
  return state.city.districts.find((district) =>
    x >= district.x
    && x <= district.x + district.w
    && y >= district.y
    && y <= district.y + district.h,
  );
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
    return;
  }

  const canvas = event.target.closest('canvas[data-city-canvas]');
  if (!canvas) return;
  const district = pickDistrictAtPoint(event.clientX, event.clientY);
  if (district) {
    state.ui.selection = { kind: 'district', key: district.key };
    render();
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
