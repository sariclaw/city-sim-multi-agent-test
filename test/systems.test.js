import assert from 'node:assert/strict';
import test from 'node:test';

import { recomputeSimulationState, tickSimulationState } from '../src/sim/systems/index.js';
import { createInitialState } from '../src/sim/world-factory.js';

test('initial recompute grows zoned tiles into low-density buildings and computes networks', () => {
  const state = createInitialState();
  recomputeSimulationState(state);

  const buildings = Object.values(state.world.buildings);
  const residential = buildings.filter((building) => building.zoneType === 'residential');
  const commercial = buildings.filter((building) => building.zoneType === 'commercial');
  const industrial = buildings.filter((building) => building.zoneType === 'industrial');

  assert.ok(residential.length > 0, 'residential zoning should spawn buildings');
  assert.ok(commercial.length > 0, 'commercial zoning should spawn buildings');
  assert.ok(industrial.length > 0, 'industrial zoning should spawn buildings');
  assert.ok(state.networks.utilities.power.coverage > 0.5, 'starter map should have meaningful power coverage');
  assert.ok(state.networks.utilities.water.coverage > 0.5, 'starter map should have meaningful water coverage');
});

test('removing the water pump collapses water coverage and stalls healthy growth', () => {
  const state = createInitialState();
  recomputeSimulationState(state);
  delete state.world.buildings.b3;
  recomputeSimulationState(state);

  assert.equal(state.networks.utilities.water.coverage, 0);
  assert.ok(
    Object.values(state.world.buildings)
      .filter((building) => building.zoneType === 'residential')
      .every((building) => building.waterCoverage === 0),
    'residential tiles should lose water service when the only water source is bulldozed',
  );
});

test('adding a steam hub near housing improves heat coverage during winter', () => {
  const state = createInitialState();
  recomputeSimulationState(state);
  const baseHeatCoverage = state.networks.heat.coverage;

  state.world.buildings.testHub = {
    id: 'testHub',
    type: 'steam-hub',
    x: 19,
    y: 14,
    residents: 0,
    jobs: 0,
    workers: 0,
    occupancy: 0,
    health: 1,
    status: 'Constructed',
  };
  recomputeSimulationState(state);

  assert.ok(state.networks.heat.coverage >= baseHeatCoverage, 'steam hub should not reduce coverage');
  assert.ok(
    Object.values(state.world.buildings)
      .filter((building) => building.zoneType === 'residential')
      .some((building) => building.heatCoverage > 0),
    'at least one residential building should become heated when a hub is added nearby',
  );
});

test('simulation remains numerically stable across multiple ticks', () => {
  const state = createInitialState();
  recomputeSimulationState(state);

  for (let index = 0; index < 24; index += 1) {
    tickSimulationState(state);
  }

  assert.equal(Number.isFinite(state.city.economy.money), true);
  assert.equal(Number.isFinite(state.city.population.total), true);
  assert.equal(Number.isFinite(state.networks.traffic.averageLoad), true);
  assert.ok(state.simulation.events.length > 0, 'ticks should keep writing events');
});
