import { BUILDING_DEFINITIONS } from '../../config/index.js';
import { getPolicyModifiers } from './policy-system.js';

function budgetMultiplier(percent) {
  return percent / 100;
}

export function runEconomySystem(state) {
  const modifiers = getPolicyModifiers(state);
  const buildings = Object.values(state.world.buildings);
  const taxes = state.city.economy.taxes;
  const budget = state.city.economy.budget;

  const residentialIncome = buildings
    .filter((building) => building.zoneType === 'residential')
    .reduce((sum, building) => sum + building.residents * (1.2 + taxes.residential * 0.08), 0);
  const commercialIncome = buildings
    .filter((building) => building.zoneType === 'commercial')
    .reduce((sum, building) => sum + building.workers * (1.8 + taxes.commercial * 0.12), 0);
  const industrialIncome = buildings
    .filter((building) => building.zoneType === 'industrial')
    .reduce((sum, building) => sum + building.workers * (1.5 + taxes.industrial * 0.12) * modifiers.productionMultiplier, 0);

  const roadUpkeep = Object.values(state.networks.roads.tiles).reduce((sum, road) => sum + (road.kind === 'avenue' ? 0.7 : 0.25), 0);
  const buildingUpkeep = buildings.reduce((sum, building) => {
    const definition = BUILDING_DEFINITIONS[building.type];
    let upkeep = definition?.upkeep ?? 0;
    if (building.type === 'clinic') upkeep *= budgetMultiplier(budget.clinic);
    if (building.type === 'fire-station') upkeep *= budgetMultiplier(budget.fire);
    if (building.type === 'heat-plant' || building.type === 'steam-hub') upkeep *= budgetMultiplier(budget.heat);
    return sum + upkeep;
  }, 0);
  const policyCost = modifiers.treasuryCostPerTick;

  const powerResource = Math.round(state.networks.utilities.power.supply * state.networks.utilities.power.coverage);
  const waterResource = Math.round(state.networks.utilities.water.supply * state.networks.utilities.water.coverage);
  const heatResource = Math.round(state.networks.heat.supply * state.networks.heat.coverage);
  const foodIncome = 5 + commercialIncome * 0.05;
  const fuelIncome = 2 + industrialIncome * 0.03;
  const foodUse = state.city.population.total * 0.18 * modifiers.foodUseMultiplier;
  const fuelUse =
    buildings
      .filter((building) => ['power-plant', 'heat-plant', 'steam-hub'].includes(building.type))
      .reduce((sum, building) => sum + (BUILDING_DEFINITIONS[building.type]?.consumes?.fuel ?? 0), 0)
    + Math.max(0, Math.abs(Math.min(state.climate.temperature, 0)) - 2) * 0.25;

  const income = residentialIncome + commercialIncome + industrialIncome;
  const expenses = roadUpkeep + buildingUpkeep + policyCost;
  const net = income - expenses;

  state.city.economy.income = Math.round(income * 10) / 10;
  state.city.economy.expenses = Math.round(expenses * 10) / 10;
  state.city.economy.net = Math.round(net * 10) / 10;
  state.city.economy.money = Math.round((state.city.economy.money + net) * 10) / 10;
  state.city.economy.food = Math.max(0, Math.round((state.city.economy.food + foodIncome - foodUse) * 10) / 10);
  state.city.economy.fuel = Math.max(0, Math.round((state.city.economy.fuel + fuelIncome - fuelUse) * 10) / 10);
  state.city.economy.power = powerResource;
  state.city.economy.water = waterResource;
  state.city.economy.heat = heatResource;
}
