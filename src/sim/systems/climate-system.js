import { SEASONS } from '../../config/index.js';
import { clearEventFlag, pushEvent } from './event-system.js';

function baselineForSeason(state) {
  return SEASONS[state.climate.seasonIndex]?.baselineTemp ?? 0;
}

function seasonLabel(state) {
  return SEASONS[state.climate.seasonIndex]?.label ?? 'Season';
}

export function advanceClimate(state) {
  state.climate.seasonTick += 1;
  state.climate.targetTemperature = baselineForSeason(state);

  const winter = SEASONS[state.climate.seasonIndex]?.key === 'winter';
  const autumn = SEASONS[state.climate.seasonIndex]?.key === 'autumn';
  const waveWindow =
    (winter && state.climate.seasonTick === 4)
    || (winter && state.climate.seasonTick === 8)
    || (autumn && state.climate.seasonTick === 9);

  if (!state.climate.coldWaveActive && waveWindow) {
    state.climate.coldWaveActive = true;
    state.climate.coldWaveTicks = winter ? 3 : 2;
    pushEvent(state, `A cold front rolls in. ${seasonLabel(state)} gets markedly harsher.`);
  }

  if (state.climate.coldWaveActive) {
    state.climate.coldWaveTicks -= 1;
    if (state.climate.coldWaveTicks <= 0) {
      state.climate.coldWaveTicks = 0;
      state.climate.coldWaveActive = false;
      clearEventFlag(state, 'heat-warning');
      pushEvent(state, 'The cold front eases. Heat demand drops back toward the seasonal baseline.');
    }
  }

  const coldPenalty = state.climate.coldWaveActive ? 6 : 0;
  const desired = baselineForSeason(state) - coldPenalty;
  state.climate.temperature += (desired - state.climate.temperature) * 0.34;
  state.climate.temperature = Math.round(state.climate.temperature * 10) / 10;

  if (state.climate.seasonTick >= state.climate.ticksPerSeason) {
    state.climate.seasonTick = 0;
    state.climate.seasonIndex += 1;

    if (state.climate.seasonIndex >= SEASONS.length) {
      state.climate.seasonIndex = 0;
      state.climate.year += 1;
      pushEvent(state, 'A new year begins. Budgets reset expectations, but winter debts remain real.');
    }

    state.climate.targetTemperature = baselineForSeason(state);
    state.climate.coldWaveActive = false;
    state.climate.coldWaveTicks = 0;
    pushEvent(state, `${seasonLabel(state)} begins. City metabolism shifts with the weather.`);
  }
}
