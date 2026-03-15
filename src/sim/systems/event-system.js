import { LOG_LIMIT } from '../../config/index.js';

export function pushEvent(state, message) {
  const season = state.climate ? state.climate.seasonIndex + 1 : 1;
  const stamp = `Y${state.climate?.year ?? 1} S${season} T${state.simulation?.tick ?? 0}`;
  state.simulation.events.unshift(`${stamp}: ${message}`);
  state.simulation.events = state.simulation.events.slice(0, LOG_LIMIT);
}

export function pushEventOnce(state, flagKey, message) {
  state.simulation._eventFlags = state.simulation._eventFlags ?? {};
  if (state.simulation._eventFlags[flagKey]) return false;
  state.simulation._eventFlags[flagKey] = true;
  pushEvent(state, message);
  return true;
}

export function clearEventFlag(state, flagKey) {
  state.simulation._eventFlags = state.simulation._eventFlags ?? {};
  delete state.simulation._eventFlags[flagKey];
}
