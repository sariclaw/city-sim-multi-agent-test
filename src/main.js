const app = document.querySelector('#app');

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const ACTION_LIMIT = 2;
const LOG_LIMIT = 8;
const TICKS_PER_SEASON = 6;
const SPEED_OPTIONS = [
  { label: '1x', value: 1, tickMs: 1000 },
  { label: '2x', value: 2, tickMs: 550 },
  { label: '4x', value: 4, tickMs: 280 },
];
const TOOLBAR_ACTIONS = [
  { key: 'inspect', icon: '[]', label: 'Inspect', kind: 'mode' },
  { key: 'farm', icon: 'F', label: 'Fields', kind: 'action' },
  { key: 'tax', icon: '$', label: 'Tax', kind: 'action' },
  { key: 'festival', icon: '*', label: 'Calm', kind: 'action' },
  { key: 'guard', icon: 'G', label: 'Watch', kind: 'action' },
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
const LOT_LAYOUT = [
  { key: 'west-yard', label: 'West Yard', x: 0.13, y: 0.77, w: 0.18, h: 0.11 },
  { key: 'north-edge', label: 'North Edge', x: 0.61, y: 0.36, w: 0.16, h: 0.11 },
  { key: 'east-slip', label: 'East Slip', x: 0.79, y: 0.34, w: 0.1, h: 0.16 },
  { key: 'market-west', label: 'Market West', x: 0.28, y: 0.4, w: 0.09, h: 0.14 },
  { key: 'south-bank', label: 'South Bank', x: 0.64, y: 0.73, w: 0.18, h: 0.11 },
  { key: 'harbor-rise', label: 'Harbor Rise', x: 0.09, y: 0.36, w: 0.12, h: 0.08 },
];

let interactiveTargets = [];
let resizeQueued = false;
let frameHandle = 0;

function createInitialState() {
  return {
    cityName: 'Stonehaven',
    year: 1,
    seasonIndex: 0,
    turn: 1,
    actionsLeft: ACTION_LIMIT,
    gameOver: false,
    resources: {
      population: 120,
      food: 90,
      treasury: 70,
      unrest: 12,
    },
    modifiers: {
      farms: 0,
      guard: 0,
      markets: 0,
    },
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
      tool: 'inspect',
      selectedId: 'district:civic',
      hoveredId: null,
    },
    log: [
      'Stonehaven opens as a compact live city. Click blocks, steer seasons, and work directly on the map.',
    ],
  };
}

let state = createInitialState();

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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

function logEvent(message) {
  state.log.unshift(`${currentSeason()} Y${state.year}: ${message}`);
  state.log = state.log.slice(0, LOG_LIMIT);
}

function changeResource(key, amount) {
  state.resources[key] += amount;
}

function mergeState(base, incoming) {
  return {
    ...base,
    ...incoming,
    resources: {
      ...base.resources,
      ...(incoming.resources ?? {}),
    },
    modifiers: {
      ...base.modifiers,
      ...(incoming.modifiers ?? {}),
    },
    sim: {
      ...base.sim,
      ...(incoming.sim ?? {}),
    },
    ui: {
      ...base.ui,
      ...(incoming.ui ?? {}),
    },
    log: Array.isArray(incoming.log) ? incoming.log.slice(0, LOG_LIMIT) : base.log,
  };
}

function normalizeState() {
  state.resources.population = Math.max(0, Math.round(state.resources.population));
  state.resources.food = Math.max(0, Math.round(state.resources.food));
  state.resources.treasury = Math.round(state.resources.treasury);
  state.resources.unrest = clamp(Math.round(state.resources.unrest), 0, 100);

  state.sim.speed = currentSpeedOption().value;
  state.sim.tick = Math.max(0, Math.round(state.sim.tick));
  state.sim.seasonLength = Math.max(1, Math.round(state.sim.seasonLength || TICKS_PER_SEASON));
  state.sim.seasonTick = clamp(Math.round(state.sim.seasonTick), 0, state.sim.seasonLength);
  state.sim.accumulatorMs = Math.max(0, state.sim.accumulatorMs || 0);
  state.sim.lastFrameMs = Math.max(0, state.sim.lastFrameMs || 0);
  state.sim.seasonProgress = clamp(state.sim.seasonTick / state.sim.seasonLength, 0, 1);

  if (!state.ui) {
    state.ui = { tool: 'inspect', selectedId: 'district:civic', hoveredId: null };
  }
  state.ui.tool = TOOLBAR_ACTIONS.some((item) => item.key === state.ui.tool) ? state.ui.tool : 'inspect';
  state.ui.selectedId = state.ui.selectedId || 'district:civic';
  state.ui.hoveredId = state.ui.hoveredId || null;

  if (!state.gameOver && state.resources.population <= 0) {
    state.gameOver = true;
    state.sim.paused = true;
    logEvent('The city is abandoned. No citizens remain to govern.');
  } else if (!state.gameOver && state.resources.unrest >= 100) {
    state.gameOver = true;
    state.sim.paused = true;
    logEvent('Unrest boils into open revolt. City rule collapses.');
  }
}

function applyAction(type) {
  if (state.gameOver || state.actionsLeft <= 0) return;

  const handlers = {
    farm() {
      changeResource('treasury', -12);
      changeResource('food', 8);
      state.modifiers.farms += 1;
      logEvent('New field strips are opened beyond the road grid.');
    },
    tax() {
      changeResource('treasury', 18 + state.modifiers.markets * 2);
      changeResource('unrest', 7);
      logEvent('The market levy is raised and coin starts moving faster.');
    },
    festival() {
      changeResource('treasury', -10);
      changeResource('food', -8);
      changeResource('unrest', -14);
      changeResource('population', 4);
      logEvent('A short civic festival cools tempers and draws new households.');
    },
    guard() {
      changeResource('treasury', -14);
      state.modifiers.guard += 1;
      changeResource('unrest', -6);
      logEvent('More watch posts appear across the busier blocks.');
    },
  };

  handlers[type]?.();
  state.actionsLeft -= 1;
  normalizeState();
  render();
}

function seasonalHarvest(season) {
  const farmBonus = state.modifiers.farms * 4;
  switch (season) {
    case 'Spring': return 14 + farmBonus;
    case 'Summer': return 18 + farmBonus;
    case 'Autumn': return 28 + farmBonus * 2;
    case 'Winter': return 6 + Math.floor(farmBonus / 2);
    default: return 0;
  }
}

function seasonalUnrestDelta(season) {
  switch (season) {
    case 'Spring': return -2;
    case 'Summer': return 2;
    case 'Autumn': return 1;
    case 'Winter': return 8;
    default: return 0;
  }
}

function turnSummary(season, harvest, foodDemand, taxes) {
  return `${season} closes: +${harvest} food, ${foodDemand} food used, +${taxes} coin.`;
}

function seasonPressureProfile(season) {
  switch (season) {
    case 'Spring': return { food: 1.1, unrest: -0.5, treasury: 1.0, growth: 0.18 };
    case 'Summer': return { food: 1.2, unrest: 0.3, treasury: 1.1, growth: 0.12 };
    case 'Autumn': return { food: 1.35, unrest: 0.2, treasury: 1.2, growth: 0.08 };
    case 'Winter': return { food: 0.55, unrest: 1.5, treasury: 0.8, growth: -0.15 };
    default: return { food: 1, unrest: 0, treasury: 1, growth: 0 };
  }
}

function tickCity() {
  if (state.gameOver) return;

  const season = currentSeason();
  const profile = seasonPressureProfile(season);
  const { population, food, unrest } = state.resources;
  const upkeep = 2 + state.modifiers.guard * 0.6;
  const foodDemand = population / 48;
  const harvest = seasonalHarvest(season) / state.sim.seasonLength;
  const taxes = (population / 18 + state.modifiers.markets * 1.5) / state.sim.seasonLength;
  const securityRelief = state.modifiers.guard * 0.7;
  const scarcity = food < 18 ? (18 - food) / 9 : 0;
  const unrestPressure = Math.max(0, unrest - 42) / 34;
  const prosperity = food > 70 && unrest < 28 ? 0.55 : 0;
  const populationDelta = profile.growth + prosperity - scarcity * 0.8 - unrestPressure * 0.65;

  changeResource('food', harvest * profile.food - foodDemand);
  changeResource('treasury', taxes * profile.treasury - upkeep);
  changeResource('unrest', profile.unrest + scarcity * 2.8 + unrestPressure * 0.7 - securityRelief);
  changeResource('population', populationDelta);

  if (state.resources.food < 0) {
    const shortage = Math.abs(state.resources.food);
    state.resources.food = 0;
    changeResource('population', -Math.ceil(shortage));
    changeResource('unrest', 5 + shortage * 1.5);
    logEvent(`Granaries empty out. ${Math.ceil(shortage)} households leave.`);
  }

  if (state.resources.treasury < -15) {
    changeResource('unrest', 3);
    logEvent('Debt stalls repairs and public patience drops.');
  }

  if (state.resources.population > population + 1 && prosperity > 0) {
    logEvent('Calm streets and full stores pull in new residents.');
  }

  state.sim.tick += 1;
  state.sim.seasonTick += 1;

  if (state.sim.seasonTick >= state.sim.seasonLength) {
    advanceSeason();
    return;
  }

  normalizeState();
  render();
}

function advanceSeason() {
  if (state.gameOver) return;

  const season = currentSeason();
  const taxes = Math.floor(state.resources.population / 14) + state.modifiers.markets * 3;
  const unrestShift = seasonalUnrestDelta(season) - state.modifiers.guard * 2;

  changeResource('treasury', taxes);
  changeResource('unrest', unrestShift);

  if (state.resources.food > 120) {
    changeResource('population', 3 + state.modifiers.farms);
    logEvent('The season ends with new migrants settling at the edge blocks.');
  }

  if (state.resources.unrest >= 60) {
    changeResource('population', -Math.ceil((state.resources.unrest - 55) / 18));
    logEvent('High unrest pushes some residents out of the city.');
  }

  logEvent(turnSummary(season, seasonalHarvest(season), Math.ceil(state.resources.population / 8), taxes));

  state.turn += 1;
  state.actionsLeft = ACTION_LIMIT;
  state.seasonIndex += 1;
  state.sim.seasonTick = 0;
  state.sim.seasonProgress = 0;

  if (state.seasonIndex >= SEASONS.length) {
    state.seasonIndex = 0;
    state.year += 1;
    state.modifiers.markets += 1;
    logEvent('A new year opens and trade routines sharpen.');
  } else {
    logEvent(`${currentSeason()} begins and district rhythms shift.`);
  }

  normalizeState();
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
  if (key === 'unrest') return value >= 65 ? 'danger' : value >= 35 ? 'warn' : 'good';
  if (key === 'treasury') return value < 0 ? 'danger' : value < 25 ? 'warn' : 'good';
  if (key === 'food') return value < 20 ? 'danger' : value < 50 ? 'warn' : 'good';
  return value < 80 ? 'warn' : 'good';
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

function createDistrictMetrics() {
  const { population, food, treasury, unrest } = state.resources;
  const liveStatus = state.gameOver ? 'Offline' : state.sim.paused ? 'Waiting' : `Live ${currentSpeedOption().label}`;

  const housingDensity = clamp(Math.round(population / 22), 2, 8);
  const commerceDensity = clamp(state.modifiers.markets + Math.round(treasury / 35), 1, 6);
  const farmDensity = clamp(state.modifiers.farms + Math.round(food / 45), 1, 6);
  const utilityLoad = clamp(2 + state.modifiers.guard + Math.round(population / 90), 2, 6);
  const industrialLoad = clamp(2 + Math.round(treasury / 40) + Math.round(unrest / 30), 2, 7);

  return {
    civic: { intensity: clamp(3 + state.modifiers.guard + state.modifiers.markets, 3, 8), status: unrest > 50 ? 'Tense' : liveStatus, facts: ['watch', 'trade', 'civic'] },
    north: { intensity: housingDensity, status: unrest > 60 ? 'Uneasy' : 'Settled', facts: ['homes', 'density', 'calm'] },
    harbor: { intensity: utilityLoad, status: food < 35 ? 'Tight' : 'Online', facts: ['water', 'power', 'flow'] },
    market: { intensity: commerceDensity, status: treasury < 20 ? 'Thin' : 'Active', facts: ['trade', 'coin', 'footfall'] },
    park: { intensity: farmDensity, status: food > 70 ? 'Productive' : 'Dry', facts: ['green', 'food', 'relief'] },
    industry: { intensity: industrialLoad, status: treasury > 40 ? 'Hot' : 'Steady', facts: ['work', 'smoke', 'output'] },
    south: { intensity: clamp(2 + state.modifiers.farms + state.modifiers.markets, 2, 6), status: population > 150 ? 'Expanding' : 'Staged', facts: ['growth', 'plots', 'mix'] },
  };
}

function createLotMetrics() {
  const { population, food, treasury, unrest } = state.resources;
  const readyScore = clamp(Math.round((treasury + food) / 30), 2, 8);

  return LOT_LAYOUT.map((lot, index) => ({
    ...lot,
    id: `lot:${lot.key}`,
    kind: 'lot',
    type: 'lot',
    intensity: clamp(readyScore + (index % 3) - Math.round(unrest / 35), 1, 9),
    status: unrest > 55 ? 'Hold' : treasury < 18 ? 'Thin funds' : 'Buildable',
    pressure: clamp(Math.round(population / 30) + index, 2, 9),
  }));
}

function createCityViewModel() {
  const season = currentSeason();
  const palette = seasonPalette(season);
  const { population, food, treasury, unrest } = state.resources;
  const districtMetrics = createDistrictMetrics();
  const powerLevel = clamp(40 + state.modifiers.guard * 10 + state.modifiers.markets * 8, 35, 98);
  const waterLevel = clamp(52 + state.modifiers.farms * 10 + Math.round(food / 3), 45, 100);
  const transitLevel = clamp(35 + state.modifiers.markets * 12 + Math.round(population / 10), 30, 96);
  const activityLevel = clamp(28 + Math.round(state.sim.seasonProgress * 40) + (state.sim.paused ? -8 : 14), 18, 96);

  const districts = DISTRICT_LAYOUT.map((district) => ({
    ...district,
    ...districtMetrics[district.key],
    id: `district:${district.key}`,
    kind: 'district',
  }));

  return {
    palette,
    districts,
    lots: createLotMetrics(),
    overlays: [
      { label: 'PWR', value: `${powerLevel}%`, tone: powerLevel > 70 ? 'good' : powerLevel > 45 ? 'warn' : 'danger' },
      { label: 'WTR', value: `${waterLevel}%`, tone: waterLevel > 70 ? 'good' : waterLevel > 50 ? 'warn' : 'danger' },
      { label: 'TRN', value: `${transitLevel}%`, tone: transitLevel > 70 ? 'good' : transitLevel > 45 ? 'warn' : 'danger' },
    ],
    demand: {
      housing: clamp(Math.round(population / 16), 4, 10),
      food: clamp(Math.round((100 - food) / 12) + 2, 2, 10),
      unrest: clamp(Math.round(unrest / 10) + 1, 1, 10),
    },
    skyline: {
      towers: clamp(3 + state.modifiers.markets, 3, 7),
      cranes: clamp(1 + Math.floor(population / 90), 1, 4),
      smoke: clamp(Math.round(unrest / 18), 0, 5),
    },
    stats: { population, food, treasury, unrest, season, activityLevel },
  };
}

function getSelectedEntity(viewModel) {
  const entities = [...viewModel.districts, ...viewModel.lots];
  return entities.find((entity) => entity.id === state.ui.selectedId) ?? viewModel.districts[0];
}

function getEntityById(viewModel, id) {
  const entities = [...viewModel.districts, ...viewModel.lots];
  return entities.find((entity) => entity.id === id) ?? null;
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
    lot: ['#b0c4cf', '#2e3f49'],
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

function drawLot(context, lot, width, height, selectionState) {
  const x = lot.x * width;
  const y = lot.y * height;
  const w = lot.w * width;
  const h = lot.h * height;
  const radius = Math.max(14, width * 0.015);

  fillRoundedRect(context, x, y, w, h, radius, 'rgba(12, 20, 27, 0.4)');
  strokeRoundedRect(context, x, y, w, h, radius, 'rgba(210, 229, 239, 0.22)', 1.2);

  context.setLineDash([8, 8]);
  strokeRoundedRect(context, x + 4, y + 4, w - 8, h - 8, radius - 4, 'rgba(255, 255, 255, 0.12)', 1);
  context.setLineDash([]);

  context.fillStyle = 'rgba(224, 238, 245, 0.88)';
  context.font = `600 ${Math.max(11, width * 0.012)}px "Trebuchet MS", sans-serif`;
  context.fillText(lot.label, x + w * 0.08, y + h * 0.38);
  context.fillStyle = 'rgba(168, 191, 204, 0.9)';
  context.font = `500 ${Math.max(10, width * 0.01)}px "Trebuchet MS", sans-serif`;
  context.fillText(lot.status, x + w * 0.08, y + h * 0.64);

  if (selectionState !== 'idle') {
    const color = selectionState === 'selected' ? 'rgba(133, 220, 255, 0.96)' : 'rgba(255, 213, 138, 0.9)';
    strokeRoundedRect(context, x - 2, y - 2, w + 4, h + 4, radius + 2, color, selectionState === 'selected' ? 3 : 2);
  }

  interactiveTargets.push({ id: lot.id, x, y, w, h });
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

function drawDistrict(context, district, width, height, selectionState) {
  const x = district.x * width;
  const y = district.y * height;
  const w = district.w * width;
  const h = district.h * height;
  const [fill, shade] = districtColor(district.type);
  const gradient = context.createLinearGradient(x, y, x + w, y + h);
  gradient.addColorStop(0, fill);
  gradient.addColorStop(1, shade);

  fillRoundedRect(context, x, y, w, h, Math.max(16, width * 0.018), gradient);
  strokeRoundedRect(context, x, y, w, h, Math.max(16, width * 0.018), 'rgba(255, 255, 255, 0.14)', 1.2);

  context.fillStyle = 'rgba(255, 255, 255, 0.05)';
  fillRoundedRect(context, x + w * 0.04, y + h * 0.06, w * 0.92, h * 0.88, Math.max(12, width * 0.015), context.fillStyle);
  drawDistrictBuildings(context, district, { x: x + w * 0.05, y: y + h * 0.18, w: w * 0.9, h: h * 0.72 });

  context.fillStyle = '#f5fbff';
  context.font = `700 ${Math.max(12, width * 0.016)}px "Trebuchet MS", sans-serif`;
  context.fillText(district.label, x + w * 0.07, y + h * 0.16);
  context.fillStyle = 'rgba(235, 246, 255, 0.82)';
  context.font = `500 ${Math.max(10, width * 0.012)}px "Trebuchet MS", sans-serif`;
  context.fillText(district.status, x + w * 0.07, y + h * 0.27);

  if (selectionState !== 'idle') {
    const color = selectionState === 'selected' ? 'rgba(133, 220, 255, 0.98)' : 'rgba(255, 213, 138, 0.92)';
    const shadow = selectionState === 'selected' ? 'rgba(133, 220, 255, 0.28)' : 'rgba(255, 213, 138, 0.2)';
    context.save();
    context.shadowColor = shadow;
    context.shadowBlur = 22;
    strokeRoundedRect(context, x - 3, y - 3, w + 6, h + 6, Math.max(20, width * 0.02), color, selectionState === 'selected' ? 3.5 : 2.2);
    context.restore();
  }

  interactiveTargets.push({ id: district.id, x, y, w, h });
}

function drawUtilities(context, width, height, overlays) {
  const startX = width * 0.73;
  const y = height * 0.06;
  const chipWidth = width * 0.07;

  overlays.forEach((overlay, index) => {
    const x = startX + index * chipWidth;
    fillRoundedRect(context, x, y, chipWidth - 8, height * 0.072, 18, 'rgba(8, 16, 24, 0.72)');
    strokeRoundedRect(context, x, y, chipWidth - 8, height * 0.072, 18, 'rgba(255, 255, 255, 0.08)', 1);
    context.fillStyle = '#dbeeff';
    context.font = `700 ${Math.max(10, width * 0.01)}px "Trebuchet MS", sans-serif`;
    context.fillText(overlay.label, x + 12, y + 18);
    context.fillStyle = overlay.tone === 'good' ? '#9ee2ad' : overlay.tone === 'warn' ? '#ffd37f' : '#ff9f91';
    context.font = `700 ${Math.max(11, width * 0.012)}px "Trebuchet MS", sans-serif`;
    context.fillText(overlay.value, x + 12, y + 36);
  });
}

function drawMap(context, viewModel, width, height) {
  interactiveTargets = [];
  const { palette, districts, lots, overlays, skyline, stats } = viewModel;
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

  lots.forEach((lot) => {
    const selectionState = state.ui.selectedId === lot.id ? 'selected' : state.ui.hoveredId === lot.id ? 'hovered' : 'idle';
    drawLot(context, lot, width, height, selectionState);
  });

  districts.forEach((district) => {
    const selectionState = state.ui.selectedId === district.id ? 'selected' : state.ui.hoveredId === district.id ? 'hovered' : 'idle';
    drawDistrict(context, district, width, height, selectionState);
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

function setHovered(id) {
  if (state.ui.hoveredId === id) return;
  state.ui.hoveredId = id;
  paintCityMap();
}

function setSelected(id) {
  if (state.ui.selectedId === id) return;
  state.ui.selectedId = id;
  render();
}

function setTool(tool) {
  if (!TOOLBAR_ACTIONS.some((item) => item.key === tool)) return;
  state.ui.tool = tool;
  render();
}

function runCanvasAction(actionKey, entityId) {
  state.ui.selectedId = entityId;
  applyAction(actionKey);
}

function canvasInteractionLabel() {
  if (state.gameOver) return 'Offline';
  if (state.actionsLeft <= 0) return 'No acts';
  const tool = TOOLBAR_ACTIONS.find((item) => item.key === state.ui.tool);
  return tool ? tool.label : 'Inspect';
}

function toolbarMarkup() {
  return TOOLBAR_ACTIONS.map((tool) => `
    <button
      class="toolbar-button ${tool.kind === 'action' ? 'is-build' : ''} ${state.ui.tool === tool.key ? 'is-active' : ''}"
      type="button"
      data-tool="${tool.key}"
      ${tool.kind === 'action' && (state.actionsLeft <= 0 || state.gameOver) ? 'disabled' : ''}
    >
      <span class="toolbar-icon">${tool.icon}</span>
      <strong>${tool.label}</strong>
    </button>
  `).join('');
}

function speedControlsMarkup() {
  return SPEED_OPTIONS.map((option) => `
    <button class="speed-chip ${option.value === state.sim.speed ? 'is-active' : ''}" type="button" data-speed="${option.value}" ${state.gameOver ? 'disabled' : ''}>${option.label}</button>
  `).join('');
}

function toneLabel(key, value) {
  const tone = resourceTone(key, value);
  if (tone === 'good') return 'Stable';
  if (tone === 'warn') return 'Watch';
  return 'Critical';
}

function selectionActions(entity) {
  if (!entity) return [];

  if (entity.kind === 'lot') {
    return [
      { key: 'farm', icon: 'F', title: 'Seed', note: '+food' },
      { key: 'tax', icon: '$', title: 'Trade', note: '+coin' },
      { key: 'guard', icon: 'G', title: 'Secure', note: '-risk' },
    ];
  }

  const byType = {
    civic: [
      { key: 'festival', icon: '*', title: 'Calm', note: '-unrest' },
      { key: 'guard', icon: 'G', title: 'Watch', note: '+order' },
      { key: 'tax', icon: '$', title: 'Levy', note: '+coin' },
    ],
    residential: [
      { key: 'festival', icon: '*', title: 'Calm', note: '-unrest' },
      { key: 'guard', icon: 'G', title: 'Patrol', note: '+order' },
      { key: 'farm', icon: 'F', title: 'Supply', note: '+food' },
    ],
    utility: [
      { key: 'guard', icon: 'G', title: 'Watch', note: '+stability' },
      { key: 'tax', icon: '$', title: 'Bill', note: '+coin' },
      { key: 'farm', icon: 'F', title: 'Store', note: '+food' },
    ],
    commercial: [
      { key: 'tax', icon: '$', title: 'Levy', note: '+coin' },
      { key: 'festival', icon: '*', title: 'Buzz', note: '+people' },
      { key: 'guard', icon: 'G', title: 'Watch', note: '-risk' },
    ],
    park: [
      { key: 'farm', icon: 'F', title: 'Grow', note: '+food' },
      { key: 'festival', icon: '*', title: 'Rest', note: '-unrest' },
      { key: 'guard', icon: 'G', title: 'Fence', note: '+order' },
    ],
    industrial: [
      { key: 'tax', icon: '$', title: 'Output', note: '+coin' },
      { key: 'guard', icon: 'G', title: 'Watch', note: '-risk' },
      { key: 'festival', icon: '*', title: 'Shift', note: '-heat' },
    ],
    mixed: [
      { key: 'farm', icon: 'F', title: 'Supply', note: '+food' },
      { key: 'tax', icon: '$', title: 'Trade', note: '+coin' },
      { key: 'festival', icon: '*', title: 'Calm', note: '-unrest' },
    ],
  };

  return byType[entity.type] ?? byType.mixed;
}

function inspectorMarkup(viewModel) {
  const selected = getSelectedEntity(viewModel);
  const { population, food, treasury, unrest } = state.resources;
  const facts = selected.kind === 'lot'
    ? [
        { icon: 'R', label: 'Ready', value: `${selected.intensity}/9` },
        { icon: 'P', label: 'Pull', value: `${selected.pressure}/9` },
        { icon: 'A', label: 'Acts', value: `${state.actionsLeft}/${ACTION_LIMIT}` },
      ]
    : [
        { icon: 'I', label: 'Intensity', value: `${selected.intensity}/9` },
        { icon: 'P', label: 'Pop', value: `${population}` },
        { icon: 'U', label: 'Unrest', value: `${unrest}%` },
      ];

  const actionsMarkup = selectionActions(selected).map((item) => `
    <button class="action-chip ${state.ui.tool === item.key ? 'is-primary' : ''}" type="button" data-panel-action="${item.key}" data-entity="${selected.id}" ${state.actionsLeft <= 0 || state.gameOver ? 'disabled' : ''}>
      <span class="toolbar-icon">${item.icon}</span>
      <strong>${item.title}</strong>
      <span>${item.note}</span>
    </button>
  `).join('');

  return `
    <section class="floating-panel inspector" aria-label="Context panel">
      <div class="panel-head">
        <span class="panel-kicker">${selected.kind === 'lot' ? 'Open Lot' : 'District'}</span>
        <div class="panel-title-row">
          <strong>${selected.label}</strong>
          <span class="status-pill">${selected.status}</span>
        </div>
        <p class="panel-status">${selected.kind === 'lot' ? 'Ready for a direct city action.' : `${selected.label} is ${selected.status.toLowerCase()}.`}</p>
      </div>
      <div class="fact-grid">
        ${facts.map((fact) => `
          <div class="fact-chip">
            <span class="fact-icon">${fact.icon}</span>
            <span>${fact.label}</span>
            <strong>${fact.value}</strong>
          </div>
        `).join('')}
      </div>
      <div class="panel-actions">
        ${actionsMarkup}
      </div>
      <div class="mini-grid">
        <div class="mini-card">
          <span class="mini-label">Food</span>
          <strong>${food}</strong>
        </div>
        <div class="mini-card">
          <span class="mini-label">Coin</span>
          <strong>${treasury}</strong>
        </div>
      </div>
    </section>
  `;
}

function render() {
  const { population, food, treasury, unrest } = state.resources;
  const viewModel = createCityViewModel();
  const simState = state.gameOver ? 'status-danger' : state.sim.paused ? 'status-paused' : 'status-live';

  app.innerHTML = `
    <main class="app-shell">
      <section class="game-shell">
        <div class="city-stage">
          <div class="city-map-frame">
            <canvas data-city-canvas aria-label="Interactive city canvas with districts, empty lots, and buildable blocks"></canvas>
          </div>
          <div class="stage-overlay">
            <div class="overlay-column">
              <section class="floating-panel hud" aria-label="City HUD">
                <div class="hud-title">
                  <span class="hud-kicker">Canvas City</span>
                  <strong>${state.cityName}</strong>
                  <div class="hud-subline">
                    <span class="capsule ${simState}">
                      <span class="chip-icon">${state.sim.paused ? '||' : '>>'}</span>
                      <strong>${state.gameOver ? 'Collapse' : state.sim.paused ? 'Paused' : `Live ${currentSpeedOption().label}`}</strong>
                    </span>
                    <span class="capsule">
                      <span class="chip-icon">Y</span>
                      <strong>${currentSeason()} · ${state.year}</strong>
                    </span>
                    <span class="capsule">
                      <span class="chip-icon">A</span>
                      <strong>${state.actionsLeft}/${ACTION_LIMIT}</strong>
                    </span>
                  </div>
                </div>
                <div class="hud-stats">
                  <span class="stat-chip">
                    <span class="chip-icon">P</span>
                    <span class="chip-label">Pop</span>
                    <strong>${population}</strong>
                  </span>
                  <span class="stat-chip">
                    <span class="chip-icon">F</span>
                    <span class="chip-label">${toneLabel('food', food)}</span>
                    <strong>${food}</strong>
                  </span>
                  <span class="stat-chip">
                    <span class="chip-icon">$</span>
                    <span class="chip-label">${toneLabel('treasury', treasury)}</span>
                    <strong>${treasury}</strong>
                  </span>
                  <span class="stat-chip">
                    <span class="chip-icon">U</span>
                    <span class="chip-label">${toneLabel('unrest', unrest)}</span>
                    <strong>${unrest}%</strong>
                  </span>
                </div>
              </section>

              <div class="stage-bottom">
                <section class="floating-panel toolbar" aria-label="Build toolbar">
                  <div class="toolbar-row">
                    <span class="toolbar-label">Tools</span>
                    <div class="toolbar-group">
                      ${toolbarMarkup()}
                    </div>
                  </div>
                  <div class="toolbar-row">
                    <button class="toolbar-toggle ${state.sim.paused ? 'is-primary' : ''}" type="button" data-action="toggle-pause" ${state.gameOver ? 'disabled' : ''}>${state.sim.paused ? 'Resume' : 'Pause'}</button>
                    <button class="toolbar-toggle" type="button" data-action="advance" ${state.gameOver ? 'disabled' : ''}>Next</button>
                    <button class="toolbar-toggle" type="button" data-action="reset">Reset</button>
                    <div class="speed-track">${speedControlsMarkup()}</div>
                  </div>
                </section>

                <section class="floating-panel ticker" aria-label="City activity">
                  <div class="ticker-row">
                    <span class="ticker-dot"></span>
                    <strong>${canvasInteractionLabel()}</strong>
                    <span>Click districts or open lots.</span>
                  </div>
                  ${state.log.slice(0, 2).map((entry) => `
                    <div class="ticker-row">
                      <span class="ticker-dot"></span>
                      <span>${entry}</span>
                    </div>
                  `).join('')}
                </section>
              </div>
            </div>

            <div class="inspector-column">
              ${inspectorMarkup(viewModel)}
            </div>
          </div>
        </div>
      </section>
    </main>
  `;

  paintCityMap();

  const canvas = document.querySelector('[data-city-canvas]');
  if (canvas) {
    canvas.addEventListener('pointermove', (event) => {
      const point = canvasPoint(event, canvas);
      const hit = hitTestCanvas(point);
      setHovered(hit?.id ?? null);
    });
    canvas.addEventListener('pointerleave', () => {
      setHovered(null);
    });
    canvas.addEventListener('click', (event) => {
      const point = canvasPoint(event, canvas);
      const hit = hitTestCanvas(point);
      if (!hit) return;

      if (state.ui.tool !== 'inspect' && !state.gameOver && state.actionsLeft > 0) {
        runCanvasAction(state.ui.tool, hit.id);
        return;
      }

      setSelected(hit.id);
    });
  }
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

window.addEventListener('resize', () => {
  if (resizeQueued) return;
  resizeQueued = true;
  window.requestAnimationFrame(() => {
    resizeQueued = false;
    paintCityMap();
  });
});

app.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;

  const { action, speed, tool, panelAction, entity } = target.dataset;
  if (action === 'advance') rushSeason();
  if (action === 'toggle-pause') togglePause();
  if (action === 'reset') {
    state = createInitialState();
    render();
  }
  if (speed) setSpeed(Number(speed));
  if (tool) setTool(tool);
  if (panelAction && entity) runCanvasAction(panelAction, entity);
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
};

normalizeState();
render();
frameHandle = window.requestAnimationFrame(simulationFrame);
