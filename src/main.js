const app = document.querySelector('#app');

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const ACTION_LIMIT = 2;
const LOG_LIMIT = 8;
const DISTRICT_LAYOUT = [
  { key: 'civic', label: 'Civic Core', type: 'civic', x: 0.38, y: 0.16, w: 0.24, h: 0.21 },
  { key: 'north', label: 'North Steps', type: 'residential', x: 0.64, y: 0.1, w: 0.22, h: 0.24 },
  { key: 'harbor', label: 'Rivergate', type: 'utility', x: 0.12, y: 0.14, w: 0.18, h: 0.27 },
  { key: 'market', label: 'Market Spine', type: 'commercial', x: 0.39, y: 0.41, w: 0.24, h: 0.19 },
  { key: 'park', label: 'Green Loop', type: 'park', x: 0.14, y: 0.47, w: 0.22, h: 0.26 },
  { key: 'industry', label: 'Ironworks', type: 'industrial', x: 0.67, y: 0.44, w: 0.19, h: 0.24 },
  { key: 'south', label: 'South Reach', type: 'mixed', x: 0.39, y: 0.65, w: 0.24, h: 0.19 },
];

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
    log: [
      'Stonehaven is founded beside a cold river valley. Balance food, coin, and public order through the seasons.',
    ],
  };
}

let state = createInitialState();

const actions = [
  {
    key: 'farm',
    label: 'Expand Fields',
    note: 'Spend treasury now, strengthen future harvests.',
  },
  {
    key: 'tax',
    label: 'Raise Taxes',
    note: 'Boost coin quickly, but unrest rises.',
  },
  {
    key: 'festival',
    label: 'Hold Festival',
    note: 'Reduce unrest and attract a few new families.',
  },
  {
    key: 'guard',
    label: 'Reinforce Watch',
    note: 'Spend coin to keep the streets calm.',
  },
];

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function currentSeason() {
  return SEASONS[state.seasonIndex];
}

function logEvent(message) {
  state.log.unshift(`${currentSeason()} Y${state.year}: ${message}`);
  state.log = state.log.slice(0, LOG_LIMIT);
}

function changeResource(key, amount) {
  state.resources[key] += amount;
}

function normalizeState() {
  state.resources.population = Math.max(0, Math.round(state.resources.population));
  state.resources.food = Math.max(0, Math.round(state.resources.food));
  state.resources.treasury = Math.round(state.resources.treasury);
  state.resources.unrest = clamp(Math.round(state.resources.unrest), 0, 100);

  if (state.resources.population <= 0) {
    state.gameOver = true;
    logEvent('The city is abandoned. No citizens remain to govern.');
  } else if (state.resources.unrest >= 100) {
    state.gameOver = true;
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
      logEvent('You expand nearby fields. Seed stores shrink now, but the next harvests will be stronger.');
    },
    tax() {
      changeResource('treasury', 18 + state.modifiers.markets * 2);
      changeResource('unrest', 7);
      logEvent('Collectors sweep the markets. Coin flows in, and resentment follows.');
    },
    festival() {
      changeResource('treasury', -10);
      changeResource('food', -8);
      changeResource('unrest', -14);
      changeResource('population', 4);
      logEvent('A civic festival restores morale and draws hopeful families into the city.');
    },
    guard() {
      changeResource('treasury', -14);
      state.modifiers.guard += 1;
      changeResource('unrest', -6);
      logEvent('You reinforce the watch. Patrols steady the streets before the next turn.');
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
  return `${season} closes: +${harvest} food produced, ${foodDemand} food consumed, +${taxes} taxes collected.`;
}

function advanceTurn() {
  if (state.gameOver) return;

  const season = currentSeason();
  const { population, food } = state.resources;
  const foodDemand = Math.ceil(population / 8);
  const harvest = seasonalHarvest(season);
  const taxes = Math.floor(population / 12) + state.modifiers.markets * 3;
  const securityRelief = state.modifiers.guard * 3;

  changeResource('food', harvest - foodDemand);
  changeResource('treasury', taxes - 4);
  changeResource('unrest', seasonalUnrestDelta(season) - securityRelief);

  if (state.resources.food < 0) {
    const shortage = Math.abs(state.resources.food);
    state.resources.food = 0;
    changeResource('population', -Math.ceil(shortage / 2));
    changeResource('unrest', 10 + shortage);
    logEvent(`Food stores fail by ${shortage}. Hunger drives families away and tempers flare.`);
  } else if (state.resources.food > food + 18) {
    changeResource('population', 3 + state.modifiers.farms);
    logEvent('Granaries are full. Traders and migrants decide the city looks safe enough to stay.');
  }

  if (state.resources.treasury < 0) {
    changeResource('unrest', 8);
    logEvent('The treasury falls into debt. Officials go unpaid and corruption spreads.');
  }

  const unrestPressure = Math.max(0, state.resources.unrest - 45);
  if (unrestPressure > 0) {
    changeResource('population', -Math.ceil(unrestPressure / 20));
    logEvent('High unrest pushes some residents to leave for calmer towns.');
  }

  logEvent(turnSummary(season, harvest, foodDemand, taxes));

  state.turn += 1;
  state.actionsLeft = ACTION_LIMIT;
  state.seasonIndex += 1;

  if (state.seasonIndex >= SEASONS.length) {
    state.seasonIndex = 0;
    state.year += 1;
    state.modifiers.markets += 1;
    logEvent('A new year begins. Market habits improve, making tax collection slightly stronger.');
  }

  normalizeState();
  render();
}

function resourceTone(key, value) {
  if (key === 'unrest') return value >= 65 ? 'danger' : value >= 35 ? 'warn' : 'good';
  if (key === 'treasury') return value < 0 ? 'danger' : value < 25 ? 'warn' : 'good';
  if (key === 'food') return value < 20 ? 'danger' : value < 50 ? 'warn' : 'good';
  return value < 80 ? 'warn' : 'good';
}

function nextSeason() {
  return SEASONS[(state.seasonIndex + 1) % SEASONS.length];
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
    log: Array.isArray(incoming.log) ? incoming.log.slice(0, LOG_LIMIT) : base.log,
  };
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

  const housingDensity = clamp(Math.round(population / 22), 2, 8);
  const commerceDensity = clamp(state.modifiers.markets + Math.round(treasury / 35), 1, 6);
  const farmDensity = clamp(state.modifiers.farms + Math.round(food / 45), 1, 6);
  const utilityLoad = clamp(2 + state.modifiers.guard + Math.round(population / 90), 2, 6);
  const industrialLoad = clamp(2 + Math.round(treasury / 40) + Math.round(unrest / 30), 2, 7);

  return {
    civic: { intensity: clamp(3 + state.modifiers.guard + state.modifiers.markets, 3, 8), status: unrest > 50 ? 'Tense governance' : 'Stable administration' },
    north: { intensity: housingDensity, status: unrest > 60 ? 'Residents uneasy' : 'Housing occupied' },
    harbor: { intensity: utilityLoad, status: food < 35 ? 'Supply constrained' : 'Utilities online' },
    market: { intensity: commerceDensity, status: treasury < 20 ? 'Thin trade' : 'Trading actively' },
    park: { intensity: farmDensity, status: food > 70 ? 'Productive green belt' : 'Fields under pressure' },
    industry: { intensity: industrialLoad, status: treasury > 40 ? 'Factories humming' : 'Workshops steady' },
    south: { intensity: clamp(2 + state.modifiers.farms + state.modifiers.markets, 2, 6), status: population > 150 ? 'Expansion underway' : 'Plots being staged' },
  };
}

function createCityViewModel() {
  const season = currentSeason();
  const palette = seasonPalette(season);
  const { population, food, treasury, unrest } = state.resources;
  const districtMetrics = createDistrictMetrics();
  const powerLevel = clamp(40 + state.modifiers.guard * 10 + state.modifiers.markets * 8, 35, 98);
  const waterLevel = clamp(52 + state.modifiers.farms * 10 + Math.round(food / 3), 45, 100);
  const transitLevel = clamp(35 + state.modifiers.markets * 12 + Math.round(population / 10), 30, 96);

  const districts = DISTRICT_LAYOUT.map((district) => ({
    ...district,
    ...districtMetrics[district.key],
  }));

  return {
    palette,
    districts,
    overlays: [
      { label: 'Power', value: `${powerLevel}%`, tone: powerLevel > 70 ? 'good' : powerLevel > 45 ? 'warn' : 'danger' },
      { label: 'Water', value: `${waterLevel}%`, tone: waterLevel > 70 ? 'good' : waterLevel > 50 ? 'warn' : 'danger' },
      { label: 'Transit', value: `${transitLevel}%`, tone: transitLevel > 70 ? 'good' : transitLevel > 45 ? 'warn' : 'danger' },
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
    stats: { population, food, treasury, unrest, season },
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
          if ((windowRow + windowCol + seed) % 3 === 0) continue;
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
  strokeRoundedRect(context, x, y, w, h, Math.max(16, width * 0.018), 'rgba(255, 255, 255, 0.14)', 1.2);

  context.fillStyle = 'rgba(255, 255, 255, 0.05)';
  fillRoundedRect(context, x + w * 0.04, y + h * 0.06, w * 0.92, h * 0.88, Math.max(12, width * 0.015), context.fillStyle);

  drawDistrictBuildings(context, district, { x: x + w * 0.05, y: y + h * 0.18, w: w * 0.9, h: h * 0.72 });

  context.fillStyle = '#f5fbff';
  context.font = `600 ${Math.max(12, width * 0.018)}px "Trebuchet MS", sans-serif`;
  context.fillText(district.label, x + w * 0.07, y + h * 0.16);

  context.fillStyle = 'rgba(235, 246, 255, 0.8)';
  context.font = `500 ${Math.max(10, width * 0.013)}px "Trebuchet MS", sans-serif`;
  context.fillText(district.status, x + w * 0.07, y + h * 0.26);
}

function drawUtilities(context, width, height, overlays) {
  const startX = width * 0.7;
  const y = height * 0.08;
  const chipWidth = width * 0.08;

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
  fillRoundedRect(context, width * 0.03, height * 0.05, width * 0.22, height * 0.14, 22, context.fillStyle);
  context.fillStyle = '#f1f8ff';
  context.font = `700 ${Math.max(14, width * 0.021)}px "Trebuchet MS", sans-serif`;
  context.fillText(`${state.cityName} Regional Plan`, width * 0.05, height * 0.105);
  context.font = `500 ${Math.max(12, width * 0.014)}px "Trebuchet MS", sans-serif`;
  context.fillStyle = 'rgba(219, 238, 255, 0.82)';
  context.fillText(`${stats.season} · Year ${state.year} · Turn ${state.turn}`, width * 0.05, height * 0.145);
  context.fillText(`Population ${stats.population} · Treasury ${stats.treasury} · Unrest ${stats.unrest}%`, width * 0.05, height * 0.175);

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
    <article class="district-card district-card-${district.type}">
      <header>
        <strong>${district.label}</strong>
        <span>Intensity ${district.intensity}</span>
      </header>
      <p>${district.status}</p>
    </article>
  `).join('');
}

function render() {
  const { population, food, treasury, unrest } = state.resources;
  const viewModel = createCityViewModel();
  const status = state.gameOver ? 'Collapse' : state.actionsLeft > 0 ? 'Council Active' : 'Awaiting Next Season';

  app.innerHTML = `
    <main class="shell">
      <section class="topbar panel">
        <div class="topbar-title">
          <p class="eyebrow">City Command Board</p>
          <h1>${state.cityName}</h1>
          <p class="topbar-copy">A live district map tied to simulation state, ready for an external scheduler or economy branch to drive.</p>
        </div>
        <div class="topbar-meta">
          <div class="meta-pill">
            <span>Clock</span>
            <strong>${currentSeason()} · Year ${state.year}</strong>
          </div>
          <div class="meta-pill">
            <span>Turn Status</span>
            <strong>${status}</strong>
          </div>
          <div class="meta-actions">
            <button class="button button-primary" type="button" data-action="advance" ${state.gameOver ? 'disabled' : ''}>End ${currentSeason()}</button>
            <button class="button button-secondary" type="button" data-action="reset">Restart Charter</button>
          </div>
        </div>
      </section>

      <section class="summary-grid" aria-label="City summary">
        <article class="summary-card panel accent-cyan ${resourceTone('population', population)}">
          <p>Population</p><strong>${population}</strong><span>Residents currently housed across active districts.</span>
        </article>
        <article class="summary-card panel accent-amber ${resourceTone('food', food)}">
          <p>Food Reserve</p><strong>${food}</strong><span>Drives parks, farms, and waterfront supply stability.</span>
        </article>
        <article class="summary-card panel accent-green ${resourceTone('treasury', treasury)}">
          <p>Treasury</p><strong>${treasury}</strong><span>Funds utilities, patrols, and civic expansion.</span>
        </article>
        <article class="summary-card panel accent-rose ${resourceTone('unrest', unrest)}">
          <p>Civic Pulse</p><strong>${unrest}%</strong><span>Higher unrest darkens the city and strains growth.</span>
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
              <span class="board-tag">Next: ${nextSeason()}</span>
            </div>
          </div>
          <div class="city-map-frame">
            <canvas data-city-canvas aria-label="Canvas map showing roads, blocks, districts, utilities, and buildings for the simulated city"></canvas>
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

            <section class="control-group">
              <h3>Simulation Hooks</h3>
              <div class="status-row"><span>Render API</span><strong>window.citySimUI</strong></div>
              <div class="status-row"><span>Yearly trade bonus</span><strong>+${state.modifiers.markets}</strong></div>
              <div class="status-row"><span>Watch strength</span><strong>${state.modifiers.guard}</strong></div>
              <div class="status-row"><span>Farm network</span><strong>${state.modifiers.farms}</strong></div>
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

let resizeQueued = false;

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

  const { action, build } = target.dataset;
  if (action === 'advance') advanceTurn();
  if (action === 'reset') {
    state = createInitialState();
    render();
  }
  if (build) applyAction(build);
});

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
};

render();
