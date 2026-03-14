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
    log: [
      'Stonehaven is founded beside a cold river valley. Balance food, coin, and public order as the city keeps moving.',
    ],
  };
}

let state = createInitialState();
let frameHandle = 0;

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

function normalizeState() {
  state.resources.population = Math.max(0, Math.round(state.resources.population));
  state.resources.food = Math.max(0, Math.round(state.resources.food));
  state.resources.treasury = Math.round(state.resources.treasury);
  state.resources.unrest = clamp(Math.round(state.resources.unrest), 0, 100);
  state.sim.seasonProgress = clamp(state.sim.seasonTick / state.sim.seasonLength, 0, 1);

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
      logEvent('You expand nearby fields. Seed stores shrink now, but future harvests will be stronger.');
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
      logEvent('You reinforce the watch. Patrols steady the streets before the next unrest spike.');
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
    logEvent(`Granaries run empty mid-season. ${Math.ceil(shortage)} households leave and tempers flare.`);
  }

  if (state.resources.treasury < -15) {
    changeResource('unrest', 3);
    logEvent('Debt now delays wages and repairs. Street grumbling spreads.');
  }

  if (state.resources.population > population + 1 && prosperity > 0) {
    logEvent('Stable stores and calm streets attract new residents.');
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
    logEvent('A surplus season ends with migrants settling near the city edge.');
  }

  if (state.resources.unrest >= 60) {
    changeResource('population', -Math.ceil((state.resources.unrest - 55) / 18));
    logEvent('Persistent unrest pushes some residents to quieter towns.');
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
    logEvent('A new year begins. Market routines sharpen, improving the city tax base.');
  } else {
    logEvent(`${currentSeason()} begins. The city rhythm shifts with the new weather.`);
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

function getSimulationSnapshot() {
  return structuredClone(state);
}

function resourceTone(key, value) {
  if (key === 'unrest') return value >= 65 ? 'danger' : value >= 35 ? 'warn' : 'good';
  if (key === 'treasury') return value < 0 ? 'danger' : value < 25 ? 'warn' : 'good';
  if (key === 'food') return value < 20 ? 'danger' : value < 50 ? 'warn' : 'good';
  return value < 80 ? 'warn' : 'good';
}

function districtMarkup() {
  const { population, food, treasury, unrest } = state.resources;
  const growthState = food > 90 && unrest < 30 ? 'Expansion Ready' : food < 30 ? 'Supply Strain' : 'Holding Pattern';
  const industrialState = treasury > 80 ? 'Workshop Surge' : treasury < 20 ? 'Thin Payroll' : 'Steady Output';
  const residentialState = unrest < 25 ? 'Calm Blocks' : unrest > 55 ? 'Protests Rising' : 'Watchful Streets';

  return `
    <div class="district-board" role="img" aria-label="Stylized city district map with six zones and live civic state">
      <article class="district district-core"><span class="district-name">Civic Core</span><span class="district-stat">Admin / Commerce</span><span class="district-meta">${state.cityName} ${state.sim.paused ? 'idle' : 'in motion'}</span></article>
      <article class="district district-harbor"><span class="district-name">Rivergate</span><span class="district-stat">Freight / Utilities</span><span class="district-meta">Stores ${food}</span></article>
      <article class="district district-residential"><span class="district-name">North Steps</span><span class="district-stat">Residential</span><span class="district-meta">${residentialState}</span></article>
      <article class="district district-industrial"><span class="district-name">Ironworks</span><span class="district-stat">Industrial</span><span class="district-meta">${industrialState}</span></article>
      <article class="district district-park"><span class="district-name">Green Loop</span><span class="district-stat">Parks / Leisure</span><span class="district-meta">Population ${population}</span></article>
      <article class="district district-expansion"><span class="district-name">South Reach</span><span class="district-stat">Expansion Reserve</span><span class="district-meta">${growthState}</span></article>
    </div>
  `;
}

function render() {
  const { population, food, treasury, unrest } = state.resources;
  const simState = state.gameOver ? 'Collapse' : state.sim.paused ? 'Paused' : 'Running';
  const actionsNote = state.gameOver
    ? 'The current charter has failed. Restart to found a new city.'
    : `${state.actionsLeft} civic actions left before ${nextSeason()}.`;
  const progressPercent = Math.round(state.sim.seasonProgress * 100);

  app.innerHTML = `
    <main class="shell">
      <section class="hero panel">
        <div class="hero-copy">
          <p class="eyebrow">Founding Session ${String(state.turn).padStart(2, '0')}</p>
          <h1>Keep the city alive while the clock keeps moving.</h1>
          <p class="hero-text">
            Seasons now advance on their own. Intervene with policy, spending, and civic relief while Stonehaven changes in real time.
          </p>
          <div class="hero-actions">
            <button class="button button-primary" type="button" data-action="toggle-pause" ${state.gameOver ? 'disabled' : ''}>${state.sim.paused ? 'Resume Simulation' : 'Pause Simulation'}</button>
            <button class="button button-secondary" type="button" data-action="advance" ${state.gameOver ? 'disabled' : ''}>Rush To Next Season</button>
            <button class="button button-secondary" type="button" data-action="reset">Restart Charter</button>
          </div>
        </div>
        <div class="hero-signal">
          <div class="signal-card">
            <span class="signal-label">Simulation</span>
            <strong>${simState}</strong>
            <p>${state.gameOver ? 'The simulation halted after the charter failed.' : `${actionsNote} Running at ${currentSpeedOption().label}.`}</p>
            <div class="sim-controls" role="group" aria-label="Simulation speed">
              <span class="sim-pill ${state.sim.paused ? 'is-paused' : 'is-live'}">${state.sim.paused ? 'Paused' : `Live ${currentSpeedOption().label}`}</span>
              ${SPEED_OPTIONS.map((option) => `
                <button class="button speed-button ${option.value === state.sim.speed ? 'is-active' : ''}" type="button" data-speed="${option.value}" ${state.gameOver ? 'disabled' : ''}>${option.label}</button>
              `).join('')}
            </div>
          </div>
          <div class="signal-grid">
            <div><span>Population</span><strong>${population}</strong></div>
            <div><span>Unrest</span><strong>${unrest}%</strong></div>
            <div><span>Treasury</span><strong>${treasury}</strong></div>
            <div><span>Food Store</span><strong>${food}</strong></div>
          </div>
        </div>
      </section>

      <section class="summary-grid" aria-label="City summary">
        <article class="summary-card panel accent-cyan ${resourceTone('population', population)}">
          <p>Population</p><strong>${population}</strong><span>Families, labor, and civic scale.</span>
        </article>
        <article class="summary-card panel accent-amber ${resourceTone('food', food)}">
          <p>Food Pressure</p><strong>${food}</strong><span>Granaries rise and fall as each tick passes.</span>
        </article>
        <article class="summary-card panel accent-green ${resourceTone('treasury', treasury)}">
          <p>Treasury</p><strong>${treasury}</strong><span>Coin now drifts with taxes, upkeep, and debt pressure.</span>
        </article>
        <article class="summary-card panel accent-rose ${resourceTone('unrest', unrest)}">
          <p>Civic Pulse</p><strong>${unrest}%</strong><span>Street pressure keeps building if you ignore the city.</span>
        </article>
      </section>

      <section class="workspace">
        <section class="board panel" aria-labelledby="district-board-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">District Overview</p>
              <h2 id="district-board-title">Founding Board</h2>
            </div>
            <span class="board-tag">${currentSeason()} · Year ${state.year}</span>
          </div>
          ${districtMarkup()}
          <div class="board-legend" aria-label="Board legend">
            <span><i class="swatch swatch-core"></i> Civic</span>
            <span><i class="swatch swatch-housing"></i> Housing</span>
            <span><i class="swatch swatch-industry"></i> Industry</span>
            <span><i class="swatch swatch-green"></i> Leisure</span>
          </div>
        </section>

        <aside class="control-panel panel" aria-labelledby="control-panel-title">
          <div class="section-heading">
            <div>
              <p class="eyebrow">Control Panel</p>
              <h2 id="control-panel-title">City Operations</h2>
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

            <section class="control-group">
              <h3>Simulation State</h3>
              <div class="status-row"><span>Current season</span><strong>${currentSeason()}</strong></div>
              <div class="status-row"><span>Next season</span><strong>${nextSeason()}</strong></div>
              <div class="status-row"><span>Season progress</span><strong>${progressPercent}%</strong></div>
              <div class="status-row"><span>Actions left</span><strong>${state.actionsLeft}</strong></div>
              <div class="status-row"><span>Yearly trade bonus</span><strong>+${state.modifiers.markets}</strong></div>
              <div class="status-row"><span>Total ticks</span><strong>${state.sim.tick}</strong></div>
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

app.addEventListener('click', (event) => {
  const target = event.target.closest('button');
  if (!target) return;

  const { action, build, speed } = target.dataset;
  if (action === 'advance') rushSeason();
  if (action === 'toggle-pause') togglePause();
  if (action === 'reset') {
    state = createInitialState();
    render();
  }
  if (build) applyAction(build);
  if (speed) setSpeed(Number(speed));
});

window.citySimState = {
  getSnapshot: getSimulationSnapshot,
};

render();
frameHandle = window.requestAnimationFrame(simulationFrame);
