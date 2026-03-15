import { BUILDING_DEFINITIONS, ZONE_DEFINITIONS } from '../../config/index.js';

export function buildingDefinitionFor(building) {
  return BUILDING_DEFINITIONS[building.type] ?? BUILDING_DEFINITIONS[building.zoneType] ?? null;
}

export function zoneTemplate(zoneType) {
  return ZONE_DEFINITIONS[zoneType]?.buildingTemplate ?? null;
}

export function buildingDemandProfile(building) {
  if (building.zoneType) {
    const template = zoneTemplate(building.zoneType);
    return {
      powerDemand: template?.powerDemand ?? 0,
      waterDemand: template?.waterDemand ?? 0,
      heatDemand: template?.heatDemand ?? 0,
      pollution: template?.pollution ?? 0,
      upkeep: template?.upkeep ?? 0,
    };
  }

  const definition = buildingDefinitionFor(building);
  return {
    powerDemand: definition?.powerDemand ?? 0,
    waterDemand: definition?.waterDemand ?? 0,
    heatDemand: definition?.heatDemand ?? 0,
    pollution: definition?.pollution ?? 0,
    upkeep: definition?.upkeep ?? 0,
  };
}

export function occupancyCapacity(building) {
  if (!building.zoneType) return 0;
  const template = zoneTemplate(building.zoneType);
  return template?.capacity ?? 0;
}

export function jobsCapacity(building) {
  if (!building.zoneType) return 0;
  const template = zoneTemplate(building.zoneType);
  return template?.jobs ?? 0;
}
