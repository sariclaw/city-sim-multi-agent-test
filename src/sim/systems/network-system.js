import {
  BUILDING_DEFINITIONS,
  ROAD_CAPACITY,
} from '../../config/index.js';
import { cardinalNeighbors, circleKeys, tileKey } from '../tile-utils.js';
import { buildingDefinitionFor, buildingDemandProfile } from './system-helpers.js';

function adjacentRoadKeys(x, y, roadTiles) {
  return cardinalNeighbors(x, y)
    .map((cell) => tileKey(cell.x, cell.y))
    .filter((key) => roadTiles[key]);
}

function computeRoadComponents(roadTiles) {
  const components = {};
  let componentId = 0;

  Object.entries(roadTiles).forEach(([startKey]) => {
    if (components[startKey]) return;
    componentId += 1;
    const stack = [startKey];
    const componentKey = `component-${componentId}`;
    components[startKey] = componentKey;

    while (stack.length) {
      const key = stack.pop();
      const road = roadTiles[key];
      if (!road) continue;
      road.load = 0;
      road.capacity = ROAD_CAPACITY[road.kind] ?? ROAD_CAPACITY.road;
      const [x, y] = key.split(',').map(Number);

      adjacentRoadKeys(x, y, roadTiles).forEach((neighborKey) => {
        if (components[neighborKey]) return;
        components[neighborKey] = componentKey;
        stack.push(neighborKey);
      });
    }
  });

  return components;
}

function waterEdge(x, y, world) {
  return cardinalNeighbors(x, y).some((neighbor) => world.tiles[tileKey(neighbor.x, neighbor.y)]?.type === 'water');
}

function buildingUtilityDemand(building, temperature) {
  const profile = buildingDemandProfile(building);
  const coldFactor = Math.max(0, Math.abs(Math.min(temperature, 0))) * 0.15;
  return {
    power: profile.powerDemand + (building.zoneType === 'residential' ? coldFactor : coldFactor * 0.5),
    water: profile.waterDemand,
    heat: profile.heatDemand + coldFactor,
  };
}

export function recomputeNetworks(state) {
  const roadTiles = state.networks.roads.tiles;
  const buildings = Object.values(state.world.buildings);
  const components = computeRoadComponents(roadTiles);
  const componentTotals = {};
  const clinicCover = new Set();
  const fireCover = new Set();
  const heatTiles = new Set();

  Object.values(roadTiles).forEach((road) => {
    road.load = 0;
    road.capacity = ROAD_CAPACITY[road.kind] ?? ROAD_CAPACITY.road;
  });

  buildings.forEach((building) => {
    const roadLinks = adjacentRoadKeys(building.x, building.y, roadTiles);
    building.connectedRoad = roadLinks[0] ?? null;
    building.componentId = building.connectedRoad ? components[building.connectedRoad] ?? null : null;
    const definition = buildingDefinitionFor(building);
    const demand = buildingUtilityDemand(building, state.climate.temperature);
    building.utilityDemand = demand;
    building.powerCoverage = 0;
    building.waterCoverage = 0;
    building.heatCoverage = 0;
    building.serviceCoverage = building.serviceCoverage ?? { clinic: 0, fire: 0 };
    building.pollution = (definition?.pollution ?? 0) + (building.zoneType === 'industrial' ? 10 : 0);

    if (building.componentId) {
      componentTotals[building.componentId] = componentTotals[building.componentId] ?? {
        powerSupply: 0,
        waterSupply: 0,
        powerDemand: 0,
        waterDemand: 0,
      };

      componentTotals[building.componentId].powerDemand += demand.power;
      componentTotals[building.componentId].waterDemand += demand.water;
    }

    if (definition?.provides?.power && building.componentId) {
      componentTotals[building.componentId].powerSupply += definition.provides.power;
    }

    if (definition?.provides?.water && building.componentId) {
      const multiplier = building.type === 'water-pump' ? (waterEdge(building.x, building.y, state.world) ? 1 : 0) : 1;
      componentTotals[building.componentId].waterSupply += definition.provides.water * multiplier;
      building.status = building.type === 'water-pump' && !waterEdge(building.x, building.y, state.world)
        ? 'Needs shoreline'
        : 'Online';
    }

    if (definition?.coverageRadius) {
      const tiles = circleKeys(building.x, building.y, definition.coverageRadius, state.world);
      tiles.forEach((key) => {
        if (building.type === 'clinic') clinicCover.add(key);
        if (building.type === 'fire-station') fireCover.add(key);
      });
    }

    if (definition?.provides?.heat) {
      const tiles = circleKeys(building.x, building.y, definition.heatRadius ?? 0, state.world);
      tiles.forEach((key) => heatTiles.add(key));
    }
  });

  buildings.forEach((building) => {
    if (building.componentId) {
      const component = componentTotals[building.componentId];
      building.powerCoverage = component.powerSupply > 0 ? Math.min(1, component.powerSupply / Math.max(component.powerDemand, 1)) : 0;
      building.waterCoverage = component.waterSupply > 0 ? Math.min(1, component.waterSupply / Math.max(component.waterDemand, 1)) : 0;
    }

    building.serviceCoverage = {
      clinic: clinicCover.has(tileKey(building.x, building.y)) ? 1 : 0,
      fire: fireCover.has(tileKey(building.x, building.y)) ? 1 : 0,
    };

    if (heatTiles.has(tileKey(building.x, building.y))) {
      building.heatCoverage = 1;
    }
  });

  let heatSupply = 0;
  let heatDemand = 0;

  buildings.forEach((building) => {
    const definition = buildingDefinitionFor(building);
    if (definition?.provides?.heat) {
      heatSupply += definition.provides.heat;
    }
    if (building.heatCoverage > 0) {
      heatDemand += building.utilityDemand.heat;
    }
  });

  const heatRatio = heatSupply > 0 ? Math.min(1, heatSupply / Math.max(heatDemand, 1)) : 0;
  buildings.forEach((building) => {
    building.heatCoverage *= heatRatio;
  });

  const totalPowerSupply = Object.values(componentTotals).reduce((sum, component) => sum + component.powerSupply, 0);
  const totalPowerDemand = Object.values(componentTotals).reduce((sum, component) => sum + component.powerDemand, 0);
  const totalWaterSupply = Object.values(componentTotals).reduce((sum, component) => sum + component.waterSupply, 0);
  const totalWaterDemand = Object.values(componentTotals).reduce((sum, component) => sum + component.waterDemand, 0);

  state.networks.roads.components = components;
  state.networks.utilities = {
    power: {
      supply: totalPowerSupply,
      demand: totalPowerDemand,
      coverage: totalPowerSupply > 0 ? Math.min(1, totalPowerSupply / Math.max(totalPowerDemand, 1)) : 0,
    },
    water: {
      supply: totalWaterSupply,
      demand: totalWaterDemand,
      coverage: totalWaterSupply > 0 ? Math.min(1, totalWaterSupply / Math.max(totalWaterDemand, 1)) : 0,
    },
    serviceCoverage: {
      clinic: buildings.length ? buildings.filter((building) => building.serviceCoverage.clinic > 0).length / buildings.length : 0,
      fire: buildings.length ? buildings.filter((building) => building.serviceCoverage.fire > 0).length / buildings.length : 0,
    },
  };

  state.networks.heat = {
    supply: heatSupply,
    demand: heatDemand,
    coverage: heatRatio,
    hotTiles: [...heatTiles],
  };
}
