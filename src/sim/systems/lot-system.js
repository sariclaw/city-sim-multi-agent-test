import { BUILDING_DEFINITIONS } from '../../config/index.js';
import { cardinalNeighbors, tileKey } from '../tile-utils.js';

function zoneBuildingId(key) {
  return `zone-${key.replace(',', '-')}`;
}

function roadAccessKey(x, y, roads) {
  return cardinalNeighbors(x, y)
    .map((cell) => tileKey(cell.x, cell.y))
    .find((key) => roads[key]) ?? null;
}

function occupiedStaticTile(buildingsById, key) {
  return Object.values(buildingsById).some((building) => tileKey(building.x, building.y) === key && !building.zoneType);
}

export function updateLots(state) {
  const roads = state.networks.roads.tiles;
  const zones = state.world.zones;
  const buildings = state.world.buildings;

  Object.entries(buildings).forEach(([id, building]) => {
    if (!building.zoneType) return;
    const key = tileKey(building.x, building.y);
    if (!zones[key] || zones[key].type !== building.zoneType) {
      delete buildings[id];
    }
  });

  Object.entries(zones).forEach(([key, zone]) => {
    const tile = state.world.tiles[key];
    if (!tile || tile.type === 'water' || tile.blocked) return;
    if (occupiedStaticTile(buildings, key)) return;

    const id = zoneBuildingId(key);
    const buildable = Boolean(roadAccessKey(tile.x, tile.y, roads));
    const utilitiesReady =
      state.networks.utilities.power.coverage > 0.55
      && state.networks.utilities.water.coverage > 0.55;
    const demand = state.city.economy.demand[zone.type] ?? 0;

    if (!buildings[id]) {
      zone.progress = Math.max(0, zone.progress ?? 0);
      if (buildable && utilitiesReady && demand > 25) {
        zone.progress += 0.18 + demand / 240;
      } else {
        zone.progress = Math.max(0, zone.progress - 0.08);
      }

      if (zone.progress < 1) return;

      const definition = BUILDING_DEFINITIONS[zone.type];
      buildings[id] = {
        id,
        type: zone.type,
        zoneType: zone.type,
        x: tile.x,
        y: tile.y,
        level: 1,
        residents: 0,
        jobs: 0,
        workers: 0,
        occupancy: 0,
        health: 1,
        status: 'Constructed',
        color: definition.color,
      };
      return;
    }

    if (!buildable) {
      zone.progress = Math.max(0.35, (zone.progress ?? 1) - 0.05);
      buildings[id].status = 'No road';
    }
  });
}
