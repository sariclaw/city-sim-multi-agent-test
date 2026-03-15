import { clamp } from '../tile-utils.js';
import { getPolicyModifiers } from './policy-system.js';

export function runHealthSystem(state) {
  const modifiers = getPolicyModifiers(state);
  const buildings = Object.values(state.world.buildings);
  const occupiedBuildings = buildings.filter((building) => building.zoneType && (building.residents > 0 || building.workers > 0));
  const coldBuildings = occupiedBuildings.filter((building) => state.climate.temperature < 0 && building.heatCoverage < 0.6);
  const dryBuildings = occupiedBuildings.filter((building) => building.waterCoverage < 0.6);
  const unpoweredBuildings = occupiedBuildings.filter((building) => building.powerCoverage < 0.6);
  const treatedShare = occupiedBuildings.length
    ? occupiedBuildings.filter((building) => building.serviceCoverage?.clinic > 0).length / occupiedBuildings.length
    : 0;
  const protectedShare = occupiedBuildings.length
    ? occupiedBuildings.filter((building) => building.serviceCoverage?.fire > 0).length / occupiedBuildings.length
    : 0;

  const foodShortage = state.city.economy.food <= 12 ? 1 : 0;
  const severeCold = Math.max(0, Math.abs(Math.min(state.climate.temperature, 0)) - 4);
  const sicknessTarget = clamp(
    occupiedBuildings.length * 0.04
      + coldBuildings.length * 0.5
      + dryBuildings.length * 0.35
      + unpoweredBuildings.length * 0.28
      + foodShortage * 4
      + severeCold * 0.4,
    0,
    Math.max(6, state.city.population.total * 0.22),
  );

  const currentSick = state.city.population.sick;
  state.city.population.sick = Math.round(
    clamp(currentSick + (sicknessTarget - currentSick) * 0.3 * modifiers.sicknessMultiplier - treatedShare, 0, 999),
  );

  const deathRisk = clamp(
    (state.city.population.sick / Math.max(state.city.population.total, 1)) * 5
      + coldBuildings.length * 0.08
      + foodShortage * 0.35
      - treatedShare * 1.4,
    0,
    3,
  );
  const deaths = state.city.population.total > 0 ? Math.floor(deathRisk) : 0;
  state.city.population.deaths += deaths;
  state.city.population.total = Math.max(0, state.city.population.total - deaths);

  const hopeTarget = clamp(
    58
      + state.networks.heat.coverage * 18
      + treatedShare * 9
      + protectedShare * 4
      + (state.city.economy.net > 0 ? 5 : -4)
      + modifiers.hopeFlat
      - state.city.population.sick * 0.35
      - severeCold * 0.9,
    0,
    100,
  );
  const discontentTarget = clamp(
    18
      + foodShortage * 14
      + coldBuildings.length * 0.9
      + unpoweredBuildings.length * 0.5
      + (state.city.economy.money < 0 ? 12 : 0)
      + modifiers.discontentFlat
      - protectedShare * 8,
    0,
    100,
  );

  state.city.population.hope = Math.round(clamp(state.city.population.hope + (hopeTarget - state.city.population.hope) * 0.28, 0, 100));
  state.city.population.discontent = Math.round(clamp(state.city.population.discontent + (discontentTarget - state.city.population.discontent) * 0.25, 0, 100));
  state.city.services.clinicCoverage = Math.round(treatedShare * 100);
  state.city.services.fireCoverage = Math.round(protectedShare * 100);
  state.city.services.wellbeing = Math.round(clamp(100 - state.city.population.sick * 1.5 - state.city.population.discontent * 0.5, 0, 100));
  state.city.services.safety = Math.round(clamp(42 + protectedShare * 48 - state.city.economy.pollution * 0.2, 0, 100));
}
