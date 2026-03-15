import { EVENT_THRESHOLDS } from '../../config/index.js';
import { advanceClimate } from './climate-system.js';
import { runEconomySystem } from './economy-system.js';
import { clearEventFlag, pushEvent, pushEventOnce } from './event-system.js';
import { runGrowthSystem } from './growth-system.js';
import { runHealthSystem } from './health-system.js';
import { updateLots } from './lot-system.js';
import { recomputeNetworks } from './network-system.js';
import { recomputeTraffic } from './traffic-system.js';

function postProcessState(state) {
  if (state.city.economy.money <= EVENT_THRESHOLDS.debtWarning) {
    pushEventOnce(state, 'debt-warning', 'Treasury has slipped deep into the red. Growth slows and the council gets nervous.');
  } else {
    clearEventFlag(state, 'debt-warning');
  }

  if (state.networks.heat.coverage < 0.55 && state.climate.temperature < 0) {
    pushEventOnce(state, 'heat-warning', 'Heat coverage is failing under the cold. Expect sickness and unrest to rise.');
  } else {
    clearEventFlag(state, 'heat-warning');
  }

  if (state.networks.utilities.water.coverage < 0.6) {
    pushEventOnce(state, 'water-warning', 'Water service is failing. Zoned growth will stall until supply recovers.');
  } else {
    clearEventFlag(state, 'water-warning');
  }

  state.simulation.gameOver =
    state.city.population.total <= 0
    || state.city.population.discontent >= EVENT_THRESHOLDS.discontentCollapse
    || state.city.population.hope <= EVENT_THRESHOLDS.hopeCollapse;

  if (state.simulation.gameOver) {
    state.simulation.paused = true;
    pushEventOnce(state, 'game-over', 'The city charter breaks. Too many people leave or lose faith to keep the settlement together.');
  }
}

export function recomputeSimulationState(state) {
  recomputeNetworks(state);
  updateLots(state);
  recomputeNetworks(state);
  runGrowthSystem(state);
  recomputeTraffic(state);
  runEconomySystem(state);
  runHealthSystem(state);
  postProcessState(state);
}

export function tickSimulationState(state) {
  state.simulation.tick += 1;
  state.simulation.turn += 1;
  advanceClimate(state);
  recomputeSimulationState(state);
  if (state.simulation.tick % 8 === 0) {
    pushEvent(
      state,
      `City pulse: pop ${state.city.population.total}, net ${Math.round(state.city.economy.net)}, heat ${Math.round(state.networks.heat.coverage * 100)}%, traffic ${Math.round(state.networks.traffic.averageLoad * 100)}%.`,
    );
  }
}
