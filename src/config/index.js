export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
export const ACTION_LIMIT = 2;
export const LOG_LIMIT = 10;
export const TICKS_PER_SEASON = 6;
export const MAP_ZOOM_DEFAULT = 1;
export const MAP_ZOOM_MIN = 0.7;
export const MAP_ZOOM_MAX = 3.2;
export const SPEED_OPTIONS = [
  { label: '1x', value: 1, tickMs: 1000 },
  { label: '2x', value: 2, tickMs: 550 },
  { label: '4x', value: 4, tickMs: 280 },
];

export const DISTRICT_DEFINITIONS = [
  { key: 'civic', label: 'Civic Core', type: 'civic' },
  { key: 'north', label: 'North Steps', type: 'residential' },
  { key: 'harbor', label: 'Rivergate', type: 'utility' },
  { key: 'market', label: 'Market Spine', type: 'commercial' },
  { key: 'park', label: 'Green Loop', type: 'park' },
  { key: 'industry', label: 'Ironworks', type: 'industrial' },
  { key: 'south', label: 'South Reach', type: 'mixed' },
];

function territory(x, y, w, h) {
  return { x, y, w, h };
}

export const WORLD_LAYOUT = {
  cols: 48,
  rows: 38,
  waterCols: 9,
  mainAvenues: {
    rows: [21],
    cols: [24],
  },
  safeArea: {
    left: 64,
    right: 380,
    top: 96,
    bottom: 184,
  },
  connectorStreets: [
    { start: { x: 17, y: 22 }, end: { x: 35, y: 22 } },
    { start: { x: 10, y: 31 }, end: { x: 38, y: 31 } },
  ],
  districts: {
    harbor: { territory: territory(10, 11, 8, 6), frontage: 'east' },
    civic: { territory: territory(26, 13, 8, 7), frontage: 'west' },
    north: { territory: territory(34, 8, 8, 7), frontage: 'south' },
    market: { territory: territory(15, 24, 8, 6), frontage: 'east' },
    park: { territory: territory(6, 24, 8, 7), frontage: 'north' },
    industry: { territory: territory(29, 24, 10, 7), frontage: 'north' },
    south: { territory: territory(17, 32, 7, 5), frontage: 'east' },
  },
};

export const DISTRICT_MODELS = {
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

export const ASSET_DEFINITIONS = [
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

export const ACTIONS = [
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

export const OPEN_ASSET_FILES = {
  city: 'assets/open/pixel-city/pixel city_0.png',
  municipal: 'assets/open/municipal-buildings/municipal buildings_0.png',
  brick: 'assets/open/brick-apartments/brick_buildings.PNG',
  brickLarge: 'assets/open/brick-apartments/brick_lg.PNG',
  roadsA: 'assets/open/streets-and-avenues/spr_roads_1_strip15_1.png',
  roadsB: 'assets/open/streets-and-avenues/spr_road_2_strip29_2.png',
};

const CLEARANCE_NONE = { front: 0, back: 0, left: 0, right: 0 };

const SPRITE_SIZE_DEFAULTS = {
  hall: {
    footprintTiles: { w: 2, h: 2 },
    anchor: { x: 0.5, y: 1 },
    clearance: CLEARANCE_NONE,
    padInset: 0.08,
    placementPriority: 120,
    drawScale: 0.94,
  },
  tower: {
    footprintTiles: { w: 2, h: 2 },
    anchor: { x: 0.5, y: 1 },
    clearance: CLEARANCE_NONE,
    padInset: 0.08,
    placementPriority: 100,
    drawScale: 0.9,
  },
  mid: {
    footprintTiles: { w: 2, h: 2 },
    anchor: { x: 0.5, y: 1 },
    clearance: CLEARANCE_NONE,
    padInset: 0.08,
    placementPriority: 80,
    drawScale: 0.84,
  },
  low: {
    footprintTiles: { w: 2, h: 1 },
    anchor: { x: 0.5, y: 1 },
    clearance: CLEARANCE_NONE,
    padInset: 0.06,
    placementPriority: 60,
    drawScale: 0.8,
  },
  small: {
    footprintTiles: { w: 1, h: 1 },
    anchor: { x: 0.5, y: 1 },
    clearance: CLEARANCE_NONE,
    padInset: 0.05,
    placementPriority: 20,
    drawScale: 0.62,
  },
};

function spriteDefinition(config) {
  const defaults = SPRITE_SIZE_DEFAULTS[config.sizeClass] ?? SPRITE_SIZE_DEFAULTS.mid;
  return {
    ...defaults,
    ...config,
    footprintTiles: {
      ...defaults.footprintTiles,
      ...(config.footprintTiles ?? {}),
    },
    anchor: {
      ...defaults.anchor,
      ...(config.anchor ?? {}),
    },
    clearance: {
      ...defaults.clearance,
      ...(config.clearance ?? {}),
    },
  };
}

export const SPRITE_CATALOG = {
  'municipal-west-hall': spriteDefinition({
    sheet: 'municipal',
    sourceRectPx: [2, 24, 70, 49],
    districtTypes: ['civic'],
    sizeClass: 'hall',
    drawScale: 0.9,
    anchor: { x: 0.48 },
  }),
  'municipal-east-hall': spriteDefinition({
    sheet: 'municipal',
    sourceRectPx: [166, 19, 70, 54],
    districtTypes: ['civic', 'utility'],
    sizeClass: 'hall',
    drawScale: 0.9,
    anchor: { x: 0.52 },
  }),
  'municipal-clinic': spriteDefinition({
    sheet: 'municipal',
    sourceRectPx: [85, 26, 66, 46],
    districtTypes: ['civic', 'utility'],
    sizeClass: 'mid',
    footprintTiles: { w: 2, h: 1 },
    drawScale: 0.78,
  }),
  'municipal-service-east': spriteDefinition({
    sheet: 'municipal',
    sourceRectPx: [244, 25, 70, 48],
    districtTypes: ['utility'],
    sizeClass: 'mid',
    footprintTiles: { w: 2, h: 1 },
    drawScale: 0.8,
    anchor: { x: 0.52 },
  }),
  'municipal-kiosk-a': spriteDefinition({
    sheet: 'municipal',
    sourceRectPx: [23, 88, 34, 29],
    districtTypes: ['civic', 'park'],
    sizeClass: 'small',
    drawScale: 0.6,
  }),
  'municipal-kiosk-b': spriteDefinition({
    sheet: 'municipal',
    sourceRectPx: [100, 88, 34, 29],
    districtTypes: ['civic', 'park'],
    sizeClass: 'small',
    drawScale: 0.6,
  }),
  'municipal-kiosk-c': spriteDefinition({
    sheet: 'municipal',
    sourceRectPx: [185, 89, 34, 29],
    districtTypes: ['park', 'utility'],
    sizeClass: 'small',
    drawScale: 0.6,
  }),
  'municipal-kiosk-d': spriteDefinition({
    sheet: 'municipal',
    sourceRectPx: [262, 89, 34, 29],
    districtTypes: ['park', 'utility'],
    sizeClass: 'small',
    drawScale: 0.6,
  }),
  'municipal-garden-west': spriteDefinition({
    sheet: 'municipal',
    sourceRectPx: [80, 137, 34, 29],
    districtTypes: ['park'],
    sizeClass: 'small',
    drawScale: 0.58,
  }),
  'municipal-garden-east': spriteDefinition({
    sheet: 'municipal',
    sourceRectPx: [200, 188, 34, 27],
    districtTypes: ['park', 'civic'],
    sizeClass: 'small',
    drawScale: 0.56,
  }),
  'city-tower-west': spriteDefinition({
    sheet: 'city',
    sourceRectPx: [127, 224, 34, 66],
    districtTypes: ['commercial', 'mixed', 'industrial'],
    sizeClass: 'tower',
    drawScale: 0.92,
    anchor: { x: 0.48 },
  }),
  'city-tower-east': spriteDefinition({
    sheet: 'city',
    sourceRectPx: [177, 225, 34, 65],
    districtTypes: ['commercial', 'mixed'],
    sizeClass: 'tower',
    drawScale: 0.92,
    anchor: { x: 0.52 },
  }),
  'city-mid-block': spriteDefinition({
    sheet: 'city',
    sourceRectPx: [57, 228, 52, 63],
    districtTypes: ['commercial', 'mixed'],
    sizeClass: 'mid',
    drawScale: 0.84,
  }),
  'city-low-block': spriteDefinition({
    sheet: 'city',
    sourceRectPx: [242, 270, 52, 32],
    districtTypes: ['commercial', 'utility'],
    sizeClass: 'low',
    drawScale: 0.82,
  }),
  'city-mid-slim': spriteDefinition({
    sheet: 'city',
    sourceRectPx: [177, 301, 34, 60],
    districtTypes: ['commercial', 'mixed'],
    sizeClass: 'tower',
    drawScale: 0.86,
  }),
  'city-mid-office': spriteDefinition({
    sheet: 'city',
    sourceRectPx: [59, 309, 52, 48],
    districtTypes: ['commercial', 'mixed'],
    sizeClass: 'mid',
    drawScale: 0.82,
    footprintTiles: { w: 2, h: 1 },
  }),
  'city-strip-industrial': spriteDefinition({
    sheet: 'city',
    sourceRectPx: [220, 329, 70, 39],
    districtTypes: ['industrial', 'utility'],
    sizeClass: 'low',
    drawScale: 0.86,
    footprintTiles: { w: 2, h: 1 },
    placementPriority: 72,
  }),
  'city-mid-warehouse': spriteDefinition({
    sheet: 'city',
    sourceRectPx: [10, 369, 52, 56],
    districtTypes: ['industrial', 'utility'],
    sizeClass: 'mid',
    drawScale: 0.82,
    footprintTiles: { w: 2, h: 1 },
  }),
  'city-slim-warehouse': spriteDefinition({
    sheet: 'city',
    sourceRectPx: [128, 367, 34, 58],
    districtTypes: ['industrial', 'mixed'],
    sizeClass: 'tower',
    drawScale: 0.84,
    footprintTiles: { w: 2, h: 1 },
  }),
  'brick-office': spriteDefinition({
    sheet: 'brick',
    sourceRectPx: [244, 115, 66, 37],
    districtTypes: ['commercial', 'mixed'],
    sizeClass: 'low',
    drawScale: 0.8,
    footprintTiles: { w: 2, h: 1 },
  }),
  'brick-mid-west': spriteDefinition({
    sheet: 'brick',
    sourceRectPx: [19, 250, 66, 82],
    districtTypes: ['residential', 'mixed'],
    sizeClass: 'tower',
    drawScale: 0.88,
    anchor: { x: 0.48 },
  }),
  'brick-mid-east': spriteDefinition({
    sheet: 'brick',
    sourceRectPx: [231, 249, 66, 79],
    districtTypes: ['residential', 'mixed'],
    sizeClass: 'tower',
    drawScale: 0.88,
    anchor: { x: 0.52 },
  }),
  'brick-mid-center': spriteDefinition({
    sheet: 'brick',
    sourceRectPx: [172, 250, 38, 66],
    districtTypes: ['residential', 'mixed'],
    sizeClass: 'tower',
    drawScale: 0.82,
    footprintTiles: { w: 1, h: 1 },
    placementPriority: 92,
  }),
  'brick-plant-west': spriteDefinition({
    sheet: 'brick',
    sourceRectPx: [257, 347, 50, 53],
    districtTypes: ['industrial'],
    sizeClass: 'mid',
    drawScale: 0.8,
    footprintTiles: { w: 1, h: 1 },
  }),
  'brick-plant-east': spriteDefinition({
    sheet: 'brick',
    sourceRectPx: [197, 350, 50, 49],
    districtTypes: ['industrial'],
    sizeClass: 'mid',
    drawScale: 0.8,
    footprintTiles: { w: 1, h: 1 },
  }),
  'brick-mixed-corner': spriteDefinition({
    sheet: 'brick',
    sourceRectPx: [136, 354, 50, 45],
    districtTypes: ['mixed'],
    sizeClass: 'mid',
    drawScale: 0.78,
  }),
  'brick-south-block': spriteDefinition({
    sheet: 'brick',
    sourceRectPx: [78, 358, 50, 41],
    districtTypes: ['mixed', 'park'],
    sizeClass: 'mid',
    drawScale: 0.78,
    footprintTiles: { w: 2, h: 1 },
  }),
  'brick-loft': spriteDefinition({
    sheet: 'brick',
    sourceRectPx: [170, 74, 50, 47],
    districtTypes: ['commercial', 'mixed'],
    sizeClass: 'mid',
    drawScale: 0.78,
    footprintTiles: { w: 2, h: 1 },
  }),
  'bricklarge-tower-west': spriteDefinition({
    sheet: 'brickLarge',
    sourceRectPx: [32, 499, 132, 164],
    districtTypes: ['residential'],
    sizeClass: 'tower',
    drawScale: 0.9,
    placementPriority: 112,
    anchor: { x: 0.48, y: 0.99 },
  }),
  'bricklarge-tower-east': spriteDefinition({
    sheet: 'brickLarge',
    sourceRectPx: [456, 497, 132, 158],
    districtTypes: ['residential'],
    sizeClass: 'tower',
    drawScale: 0.9,
    placementPriority: 112,
    anchor: { x: 0.52, y: 0.99 },
  }),
  'bricklarge-mid-plaza': spriteDefinition({
    sheet: 'brickLarge',
    sourceRectPx: [142, 317, 132, 92],
    districtTypes: ['mixed', 'commercial'],
    sizeClass: 'mid',
    drawScale: 0.88,
    placementPriority: 88,
  }),
  'bricklarge-factory': spriteDefinition({
    sheet: 'brickLarge',
    sourceRectPx: [334, 331, 100, 78],
    districtTypes: ['industrial'],
    sizeClass: 'mid',
    drawScale: 0.84,
    footprintTiles: { w: 2, h: 2 },
    placementPriority: 96,
  }),
};

export const DISTRICT_COMPOSITIONS = {
  civic: [
    { spriteId: 'municipal-west-hall' },
    { spriteId: 'municipal-clinic' },
    { spriteId: 'municipal-east-hall' },
    { spriteId: 'municipal-kiosk-a' },
    { spriteId: 'municipal-kiosk-b' },
  ],
  residential: [
    { spriteId: 'bricklarge-tower-west' },
    { spriteId: 'bricklarge-tower-east' },
    { spriteId: 'brick-mid-west' },
    { spriteId: 'brick-mid-center' },
    { spriteId: 'brick-mid-east' },
  ],
  utility: [
    { spriteId: 'municipal-clinic' },
    { spriteId: 'municipal-service-east' },
    { spriteId: 'city-strip-industrial' },
    { spriteId: 'municipal-kiosk-d' },
  ],
  commercial: [
    { spriteId: 'city-tower-west' },
    { spriteId: 'city-mid-block' },
    { spriteId: 'city-tower-east' },
    { spriteId: 'city-low-block' },
    { spriteId: 'brick-office' },
  ],
  industrial: [
    { spriteId: 'city-strip-industrial' },
    { spriteId: 'bricklarge-factory' },
    { spriteId: 'brick-plant-west' },
    { spriteId: 'brick-plant-east' },
  ],
  park: [
    { spriteId: 'municipal-kiosk-a' },
    { spriteId: 'municipal-kiosk-c' },
    { spriteId: 'municipal-garden-west' },
  ],
  mixed: [
    { spriteId: 'city-mid-office' },
    { spriteId: 'bricklarge-mid-plaza' },
    { spriteId: 'brick-mixed-corner' },
    { spriteId: 'city-slim-warehouse' },
  ],
};

export const ASSET_ICON_SPRITES = {
  'civic-hall': { sheet: 'municipal', region: [0.06, 0.06, 0.34, 0.52] },
  'north-terraces': { sheet: 'brick', region: [0.5, 0.08, 0.34, 0.64] },
  'harbor-grid': { sheet: 'roadsB', region: [0.4, 0.5, 0.2, 0.2] },
  'market-exchange': { sheet: 'city', region: [0.5, 0.06, 0.24, 0.22] },
  'park-greenhouses': { sheet: 'municipal', region: [0.36, 0.1, 0.18, 0.22] },
  'industry-foundry': { sheet: 'city', region: [0.52, 0.52, 0.26, 0.28] },
  'south-crossings': { sheet: 'brickLarge', region: [0.06, 0.1, 0.28, 0.68] },
};
