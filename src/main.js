const app = document.querySelector('#app');

const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'];
const ACTION_LIMIT = 2;
const LOG_LIMIT = 8;

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

function districtMarkup() {
  return `
    <div class="district-board" role="img" aria-label="Stylized city district map with six zones">
      <article class="district district-core"><span class="district-name">Civic Core</span><span class="district-stat">Admin / Commerce</span></article>
      <article class="district district-harbor"><span class="district-name">Rivergate</span><span class="district-stat">Freight / Utilities</span></article>
      <article class="district district-residential"><span class="district-name">North Steps</span><span class="district-stat">Residential</span></article>
      <article class="district district-industrial"><span class="district-name">Ironworks</span><span class="district-stat">Industrial</span></article>
      <article class="district district-park"><span class="district-name">Green Loop</span><span class="district-stat">Parks / Leisure</span></article>
      <article class="district district-expansion"><span class="district-name">South Reach</span><span class="district-stat">Expansion Reserve</span></article>
    </div>
  `;
}

function render() {
  const { population, food, treasury, unrest } = state.resources;
  const status = state.gameOver ? 'Collapse' : state.actionsLeft > 0 ? 'Council Active' : 'Awaiting Next Season';

  app.innerHTML = `
    <main class="shell">
      <section class="hero panel">
        <div class="hero-copy">
          <p class="eyebrow">Founding Session ${String(state.turn).padStart(2, '0')}</p>
          <h1>Establish the city before the first rush hour hits.</h1>
          <p class="hero-text">
            Shape a district network, balance utilities, and keep the city alive through a seasonal civic loop.
          </p>
          <div class="hero-actions">
            <button class="button button-primary" type="button" data-action="advance" ${state.gameOver ? 'disabled' : ''}>End ${currentSeason()}</button>
            <button class="button button-secondary" type="button" data-action="reset">Restart Charter</button>
          </div>
        </div>
        <div class="hero-signal">
          <div class="signal-card">
            <span class="signal-label">Status</span>
            <strong>${status}</strong>
            <p>${state.gameOver ? 'The current charter has failed. Restart to found a new city.' : `${state.actionsLeft} civic actions left before ${nextSeason()}.`}</p>
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
          <p>Food Pressure</p><strong>${food}</strong><span>Keep granaries ahead of seasonal demand.</span>
        </article>
        <article class="summary-card panel accent-green ${resourceTone('treasury', treasury)}">
          <p>Treasury</p><strong>${treasury}</strong><span>Coin fuels expansion, patrols, and relief.</span>
        </article>
        <article class="summary-card panel accent-rose ${resourceTone('unrest', unrest)}">
          <p>Civic Pulse</p><strong>${unrest}%</strong><span>Too much unrest and the city fractures.</span>
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
              <h3>Forecast</h3>
              <div class="status-row"><span>Current season</span><strong>${currentSeason()}</strong></div>
              <div class="status-row"><span>Next season</span><strong>${nextSeason()}</strong></div>
              <div class="status-row"><span>Actions left</span><strong>${state.actionsLeft}</strong></div>
              <div class="status-row"><span>Yearly trade bonus</span><strong>+${state.modifiers.markets}</strong></div>
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

render();
