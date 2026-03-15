import { ZONE_DEFINITIONS } from '../../config/index.js';
import { clamp } from '../tile-utils.js';
import { getPolicyModifiers } from './policy-system.js';
import { jobsCapacity, occupancyCapacity } from './system-helpers.js';

function landValueForBuilding(state, building) {
  const nearWater = Object.values(state.world.tiles).some((tile) => (
    tile.type === 'water'
    && Math.abs(tile.x - building.x) + Math.abs(tile.y - building.y) <= 4
  ));
  const hillBonus = state.world.tiles[`${building.x},${building.y}`]?.height ?? 0;
  const serviceBonus = (building.serviceCoverage?.clinic ?? 0) * 12 + (building.serviceCoverage?.fire ?? 0) * 8;
  const pollutionPenalty = building.zoneType === 'industrial' ? 18 : state.city.economy.pollution * 0.12;
  return clamp(42 + (nearWater ? 9 : 0) + hillBonus * 6 + serviceBonus - pollutionPenalty, 5, 96);
}

export function runGrowthSystem(state) {
  const modifiers = getPolicyModifiers(state);
  const buildings = Object.values(state.world.buildings);
  const trafficPenalty = clamp(state.networks.traffic.averageLoad * 34, 0, 28);
  const coldPenalty = Math.max(0, Math.abs(Math.min(state.climate.temperature, 0)) - 4);
  const taxes = state.city.economy.taxes;

  const totalResidentialCapacity = buildings.reduce((sum, building) => sum + occupancyCapacity(building), 0);
  const totalJobCapacity = buildings.reduce((sum, building) => sum + jobsCapacity(building), 0);
  const employed = buildings.reduce((sum, building) => sum + (building.workers ?? 0), 0);
  const workforce = Math.max(12, Math.round(state.city.population.total * 0.56));
  const unemployment = Math.max(0, workforce - employed);

  state.city.economy.demand = {
    residential: clamp(
      52
        + (totalJobCapacity - workforce) * 0.8
        + (state.city.population.hope - state.city.population.discontent) * 0.35
        - coldPenalty * 2.4
        - (taxes.residential - 9) * 3.5,
      0,
      100,
    ),
    commercial: clamp(
      46
        + state.city.population.total * 0.12
        + totalResidentialCapacity * 0.06
        - trafficPenalty
        - (taxes.commercial - 9) * 3
        - state.city.economy.pollution * 0.18,
      0,
      100,
    ),
    industrial: clamp(
      44
        + unemployment * 1.1
        + state.city.economy.fuel * 0.12
        - trafficPenalty * 0.7
        - (taxes.industrial - 9) * 2.7
        + (modifiers.productionMultiplier - 1) * 35,
      0,
      100,
    ),
  };

  buildings.forEach((building) => {
    if (!building.zoneType) return;

    const utilities = Math.min(building.powerCoverage, building.waterCoverage);
    const heatCoverage = state.climate.temperature < 0 ? building.heatCoverage : 1;
    const serviceCoverage = building.serviceCoverage?.clinic ?? 0;
    const definition = ZONE_DEFINITIONS[building.zoneType];
    const demand = state.city.economy.demand[building.zoneType] ?? 0;
    const landValue = landValueForBuilding(state, building);
    building.landValue = landValue;

    if (building.zoneType === 'residential') {
      const capacity = occupancyCapacity(building);
      const target = capacity * clamp(
        demand / 100
          * utilities
          * (0.65 + heatCoverage * 0.35 + serviceCoverage * 0.15)
          * (landValue / 60),
        0,
        1.15,
      );
      building.residents += (target - building.residents) * 0.26;
      building.residents = clamp(Math.round(building.residents * 10) / 10, 0, capacity);
      building.occupancy = capacity ? building.residents / capacity : 0;
      building.status =
        utilities < 0.5 ? 'No utilities'
        : heatCoverage < 0.55 && state.climate.temperature < 0 ? 'Cold'
        : demand < 25 ? 'Weak demand'
        : 'Occupied';
      return;
    }

    const capacity = jobsCapacity(building);
    const targetJobs = capacity * clamp(
      demand / 100
        * utilities
        * (0.72 + heatCoverage * 0.28)
        * (building.zoneType === 'commercial' ? landValue / 70 : 0.85),
      0,
      1.1,
    );
    building.jobs = capacity;
    building.workers += (targetJobs - building.workers) * 0.24;
    building.workers = clamp(Math.round(building.workers * 10) / 10, 0, capacity);
    building.occupancy = capacity ? building.workers / capacity : 0;
    building.status =
      utilities < 0.5 ? 'No utilities'
      : demand < 25 ? 'Weak demand'
      : 'Operating';

    if (definition.buildingTemplate.pollution) {
      building.pollution = definition.buildingTemplate.pollution * (0.55 + building.occupancy * 0.6);
    }
  });

  const totalPopulation = buildings.reduce((sum, building) => sum + (building.residents ?? 0), 0);
  const totalJobsFilled = buildings.reduce((sum, building) => sum + (building.workers ?? 0), 0);

  state.city.population.total = Math.round(totalPopulation);
  state.city.population.housed = Math.round(totalPopulation);
  state.city.population.workforce = Math.round(workforce);
  state.city.population.employed = Math.round(totalJobsFilled);
  state.city.population.homeless = Math.max(0, Math.round(totalPopulation - totalResidentialCapacity));
  state.city.economy.landValue = Math.round(
    buildings.filter((building) => building.zoneType).reduce((sum, building) => sum + (building.landValue ?? 0), 0)
      / Math.max(buildings.filter((building) => building.zoneType).length, 1),
  );
  state.city.economy.pollution = Math.round(
    buildings.reduce((sum, building) => sum + (building.pollution ?? 0), 0) / Math.max(buildings.length, 1),
  );
}
