export const LOG_LIMIT = 24;
export const TICKS_PER_SEASON = 10;
export const MAP_ZOOM_DEFAULT = 1;
export const MAP_ZOOM_MIN = 0.65;
export const MAP_ZOOM_MAX = 2.8;
export const DEFAULT_OVERLAY = 'none';

export const SPEED_OPTIONS = [
  { label: '1x', value: 1, tickMs: 850 },
  { label: '2x', value: 2, tickMs: 430 },
  { label: '4x', value: 4, tickMs: 210 },
];

export const SEASONS = [
  { key: 'spring', label: 'Spring', baselineTemp: 7, color: '#90cf9f' },
  { key: 'summer', label: 'Summer', baselineTemp: 16, color: '#f0c878' },
  { key: 'autumn', label: 'Autumn', baselineTemp: 2, color: '#c58a5c' },
  { key: 'winter', label: 'Winter', baselineTemp: -11, color: '#9bc3e6' },
];

export const WORLD_LAYOUT = {
  cols: 34,
  rows: 28,
  safeArea: {
    left: 64,
    right: 420,
    top: 96,
    bottom: 210,
  },
};

export const TOOL_DEFINITIONS = [
  { key: 'road', label: 'Road', kind: 'network', drag: 'line', cost: 3 },
  { key: 'avenue', label: 'Avenue', kind: 'network', drag: 'line', cost: 7 },
  { key: 'zone-R', label: 'Zone R', kind: 'zone', zoneType: 'residential', drag: 'rect', cost: 2 },
  { key: 'zone-C', label: 'Zone C', kind: 'zone', zoneType: 'commercial', drag: 'rect', cost: 2 },
  { key: 'zone-I', label: 'Zone I', kind: 'zone', zoneType: 'industrial', drag: 'rect', cost: 2 },
  { key: 'power-plant', label: 'Power Plant', kind: 'building', buildingType: 'power-plant', cost: 140 },
  { key: 'water-system', label: 'Water Pump/Tower', kind: 'building', buildingType: 'water-system', cost: 110 },
  { key: 'clinic', label: 'Clinic', kind: 'building', buildingType: 'clinic', cost: 95 },
  { key: 'fire-station', label: 'Fire Station', kind: 'building', buildingType: 'fire-station', cost: 95 },
  { key: 'heat-plant', label: 'Heat Plant', kind: 'building', buildingType: 'heat-plant', cost: 130 },
  { key: 'steam-hub', label: 'Steam Hub', kind: 'building', buildingType: 'steam-hub', cost: 55 },
  { key: 'bulldoze', label: 'Bulldoze', kind: 'bulldoze', drag: 'rect', cost: 0 },
];

export const OVERLAY_DEFINITIONS = [
  { key: 'none', label: 'Default' },
  { key: 'traffic', label: 'Traffic' },
  { key: 'heat', label: 'Heat' },
  { key: 'power', label: 'Power' },
  { key: 'water', label: 'Water' },
  { key: 'land-value', label: 'Land' },
  { key: 'pollution', label: 'Pollution' },
  { key: 'services', label: 'Services' },
];

export const POLICY_DEFINITIONS = [
  {
    key: 'rationing',
    label: 'Rationing',
    description: 'Cuts food consumption, but increases discontent.',
  },
  {
    key: 'emergency-shift',
    label: 'Emergency Shift',
    description: 'Raises production and tax output, but harms hope and health.',
  },
  {
    key: 'heating-subsidy',
    label: 'Heating Subsidy',
    description: 'Softens cold penalties at a steady treasury cost.',
  },
  {
    key: 'work-safety',
    label: 'Work Safety',
    description: 'Lowers sickness and fire risk at the cost of some productivity.',
  },
  {
    key: 'curfew',
    label: 'Curfew',
    description: 'Reduces congestion and unrest, but hurts hope.',
  },
];

export const TAX_RATE_LIMITS = {
  min: 4,
  max: 18,
  step: 1,
};

export const BUDGET_LIMITS = {
  min: 60,
  max: 150,
  step: 10,
};

export const ZONE_DEFINITIONS = {
  residential: {
    color: '#7ec7ff',
    baseDemandImpact: 'housing',
    buildingTemplate: {
      capacity: 14,
      jobs: 0,
      landValueWeight: 1.15,
      powerDemand: 4,
      waterDemand: 3,
      heatDemand: 7,
      upkeep: 1,
    },
  },
  commercial: {
    color: '#ffcf76',
    baseDemandImpact: 'commerce',
    buildingTemplate: {
      capacity: 0,
      jobs: 10,
      landValueWeight: 1,
      powerDemand: 5,
      waterDemand: 2,
      heatDemand: 4,
      upkeep: 2,
    },
  },
  industrial: {
    color: '#d68e73',
    baseDemandImpact: 'industry',
    buildingTemplate: {
      capacity: 0,
      jobs: 14,
      landValueWeight: 0.72,
      powerDemand: 7,
      waterDemand: 4,
      heatDemand: 3,
      upkeep: 3,
      pollution: 12,
    },
  },
};

export const BUILDING_DEFINITIONS = {
  'power-plant': {
    label: 'Power Plant',
    kind: 'utility',
    color: '#c0d2df',
    roadRequired: true,
    placement: { size: 1 },
    provides: { power: 170 },
    consumes: { fuel: 3 },
    upkeep: 8,
    pollution: 14,
  },
  'water-pump': {
    label: 'Water Pump',
    kind: 'utility',
    color: '#7ed8e8',
    roadRequired: true,
    needsWaterEdge: true,
    placement: { size: 1 },
    provides: { water: 150 },
    upkeep: 6,
  },
  'water-tower': {
    label: 'Water Tower',
    kind: 'utility',
    color: '#97bde5',
    roadRequired: true,
    placement: { size: 1 },
    provides: { water: 90 },
    upkeep: 5,
  },
  clinic: {
    label: 'Clinic',
    kind: 'service',
    color: '#c5f0cb',
    roadRequired: true,
    placement: { size: 1 },
    coverageRadius: 4,
    upkeep: 5,
  },
  'fire-station': {
    label: 'Fire Station',
    kind: 'service',
    color: '#ffb986',
    roadRequired: true,
    placement: { size: 1 },
    coverageRadius: 4,
    upkeep: 5,
  },
  'heat-plant': {
    label: 'Heat Plant',
    kind: 'utility',
    color: '#ff8d6d',
    roadRequired: true,
    placement: { size: 1 },
    provides: { heat: 110 },
    consumes: { fuel: 4 },
    heatRadius: 5,
    upkeep: 7,
    pollution: 8,
  },
  'steam-hub': {
    label: 'Steam Hub',
    kind: 'utility',
    color: '#ffd58e',
    roadRequired: true,
    placement: { size: 1 },
    provides: { heat: 40 },
    consumes: { fuel: 2 },
    heatRadius: 3,
    upkeep: 2,
  },
  residential: {
    label: 'Housing Block',
    kind: 'zone-building',
    color: '#87cfff',
    roadRequired: true,
    placement: { size: 1 },
    upkeep: 1,
  },
  commercial: {
    label: 'Market Row',
    kind: 'zone-building',
    color: '#ffd481',
    roadRequired: true,
    placement: { size: 1 },
    upkeep: 2,
  },
  industrial: {
    label: 'Workshop',
    kind: 'zone-building',
    color: '#d99179',
    roadRequired: true,
    placement: { size: 1 },
    upkeep: 3,
  },
};

export const OPEN_ASSET_FILES = {
  city: 'assets/open/pixel-city/pixel city_0.png',
  municipal: 'assets/open/municipal-buildings/municipal buildings_0.png',
  brick: 'assets/open/brick-apartments/brick_buildings.PNG',
  brickLarge: 'assets/open/brick-apartments/brick_lg.PNG',
  roadsA: 'assets/open/streets-and-avenues/spr_roads_1_strip15_1.png',
  roadsB: 'assets/open/streets-and-avenues/spr_road_2_strip29_2.png',
};

export const BUILDING_SPRITES = {
  residential: [
    { sheet: 'brick', sourceRectPx: [170, 74, 50, 47], drawScale: 0.88, minOccupancy: 0 },
    { sheet: 'brick', sourceRectPx: [19, 250, 66, 82], drawScale: 0.76, minOccupancy: 0.55 },
  ],
  commercial: [
    { sheet: 'brick', sourceRectPx: [244, 115, 66, 37], drawScale: 0.88, minOccupancy: 0 },
    { sheet: 'city', sourceRectPx: [59, 309, 52, 48], drawScale: 0.92, minOccupancy: 0.55 },
  ],
  industrial: [
    { sheet: 'city', sourceRectPx: [220, 329, 70, 39], drawScale: 0.92, minOccupancy: 0 },
    { sheet: 'brick', sourceRectPx: [257, 347, 50, 53], drawScale: 0.88, minOccupancy: 0.45 },
  ],
  'power-plant': [
    { sheet: 'city', sourceRectPx: [10, 369, 52, 56], drawScale: 0.92, minOccupancy: 0 },
  ],
  'heat-plant': [
    { sheet: 'brickLarge', sourceRectPx: [334, 331, 100, 78], drawScale: 0.66, minOccupancy: 0 },
  ],
  'water-pump': [
    { sheet: 'municipal', sourceRectPx: [244, 25, 70, 48], drawScale: 0.78, minOccupancy: 0 },
  ],
  'water-tower': [
    { sheet: 'municipal', sourceRectPx: [166, 19, 70, 54], drawScale: 0.8, minOccupancy: 0 },
  ],
  clinic: [
    { sheet: 'municipal', sourceRectPx: [85, 26, 66, 46], drawScale: 0.78, minOccupancy: 0 },
  ],
  'fire-station': [
    { sheet: 'municipal', sourceRectPx: [166, 19, 70, 54], drawScale: 0.82, minOccupancy: 0 },
  ],
  'steam-hub': [
    { sheet: 'municipal', sourceRectPx: [185, 89, 34, 29], drawScale: 0.72, minOccupancy: 0 },
  ],
};

export const ROAD_CAPACITY = {
  road: 28,
  avenue: 52,
};

export const RESOURCE_DEFAULTS = {
  money: 480,
  food: 120,
  fuel: 70,
};

export const EVENT_THRESHOLDS = {
  debtWarning: -80,
  discontentCollapse: 96,
  hopeCollapse: 4,
};
