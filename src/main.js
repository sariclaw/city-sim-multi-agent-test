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

function applyAction(type) {
  if (state.gameOver || state.actionsLeft <= 0) {
    return;
  }

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
      logEvent('A civic festival restores morale and draws a few hopeful families into the city.');
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

function advanceTurn() {
  if (state.gameOver) {
    return;
  }

  const season = currentSeason();
  const { population, food, unrest } = state.resources;
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

function seasonalHarvest(season) {
  const farmBonus = state.modifiers.farms * 4;

  switch (season) {
    case 'Spring':
      return 14 + farmBonus;
    case 'Summer':
      return 18 + farmBonus;
    case 'Autumn':
      return 28 + farmBonus * 2;
    case 'Winter':
      return 6 + Math.floor(farmBonus / 2);
    default:
      return 0;
  }
}

function seasonalUnrestDelta(season) {
  switch (season) {
    case 'Spring':
      return -2;
    case 'Summer':
      return 2;
    case 'Autumn':
      return 1;
    case 'Winter':
      return 8;
    default:
      return 0;
  }
}

function turnSummary(season, harvest, foodDemand, taxes) {
  return `${season} closes: +${harvest} food produced, ${foodDemand} food consumed, +${taxes} taxes collected.`;
}

function resourceTone(key, value) {
  if (key === 'unrest') {
    return value >= 65 ? 'danger' : value >= 35 ? 'warn' : 'good';
  }

  if (key === 'treasury') {
    return value < 0 ? 'danger' : value < 25 ? 'warn' : 'good';
  }

  if (key === 'food') {
    return value < 20 ? 'danger' : value < 50 ? 'warn' : 'good';
  }

  return value < 80 ? 'warn' : 'good';
}

function render() {
  const season = currentSeason();
  const { population, food, treasury, unrest } = state.resources;
  const actionDisabled = state.gameOver || state.actionsLeft <= 0;

  app.innerHTML = `
    <main class="shell">
      <section class="hero">
        <div>
          <p class="eyebrow">Seasonal City Simulation</p>
          <h1>${state.cityName}</h1>
          <p class="summary">Guide a small frontier city through shifting harvests, scarce coin, and public pressure. You get ${ACTION_LIMIT} decisions per season before time advances.</p>
        </div>
        <div class="season-card">
          <span>Year ${state.year}</span>
          <strong>${season}</strong>
          <span>Turn ${state.turn}</span>
        </div>
      </section>

      <section class="stats">
        ${statCard('Population', population, resourceTone('population', population))}
        ${statCard('Food', food, resourceTone('food', food))}
        ${statCard('Treasury', treasury, resourceTone('treasury', treasury))}
        ${statCard('Unrest', `${unrest}%`, resourceTone('unrest', unrest))}
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>Actions</h2>
          <p>${state.gameOver ? 'Simulation ended' : `${state.actionsLeft} of ${ACTION_LIMIT} actions left this season`}</p>
        </div>
        <div class="actions">
          ${actionButton('farm', 'Expand Farms', 'Pay 12 treasury for immediate food and stronger future harvests.', actionDisabled || treasury < 12)}
          ${actionButton('tax', 'Collect Taxes', 'Gain treasury fast, but unrest rises.', actionDisabled)}
          ${actionButton('festival', 'Hold Festival', 'Spend food and coin to reduce unrest and attract new residents.', actionDisabled || treasury < 10 || food < 8)}
          ${actionButton('guard', 'Reinforce Watch', 'Spend treasury to lower unrest and improve passive security.', actionDisabled || treasury < 14)}
        </div>
        <button class="advance-button" data-action="advance">${state.gameOver ? 'Restart Simulation' : `Advance to ${SEASONS[(state.seasonIndex + 1) % SEASONS.length]}`}</button>
      </section>

      <section class="panel">
        <div class="panel-header">
          <h2>City Report</h2>
          <p>Recent outcomes and simulation feedback</p>
        </div>
        <ul class="log">
          ${state.log.map((entry) => `<li>${entry}</li>`).join('')}
        </ul>
      </section>
    </main>
  `;
}

function statCard(label, value, tone) {
  return `
    <article class="stat ${tone}">
      <span>${label}</span>
      <strong>${value}</strong>
    </article>
  `;
}

function actionButton(action, label, detail, disabled) {
  return `
    <button class="action-card" data-action="${action}" ${disabled ? 'disabled' : ''}>
      <strong>${label}</strong>
      <span>${detail}</span>
    </button>
  `;
}

app.addEventListener('click', (event) => {
  const target = event.target.closest('[data-action]');

  if (!target) {
    return;
  }

  const { action } = target.dataset;

  if (action === 'advance') {
    if (state.gameOver) {
      state = createInitialState();
      render();
      return;
    }

    advanceTurn();
    return;
  }

  applyAction(action);
});

render();
