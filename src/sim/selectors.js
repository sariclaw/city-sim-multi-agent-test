import {
  BUILDING_DEFINITIONS,
  DEFAULT_OVERLAY,
  OVERLAY_DEFINITIONS,
  SEASONS,
  TOOL_DEFINITIONS,
} from '../config/index.js';
import { lineKeys, orthogonalPathKeys, rectKeys, tileKey } from './tile-utils.js';

export function currentSeason(state) {
  return SEASONS[state.climate.seasonIndex] ?? SEASONS[0];
}

export function toolDefinition(key) {
  return TOOL_DEFINITIONS.find((tool) => tool.key === key) ?? TOOL_DEFINITIONS[0];
}

export function overlayDefinition(key) {
  return OVERLAY_DEFINITIONS.find((overlay) => overlay.key === key) ?? OVERLAY_DEFINITIONS[0];
}

export function tileAt(state, keyOrCoords) {
  const key = typeof keyOrCoords === 'string' ? keyOrCoords : tileKey(keyOrCoords.x, keyOrCoords.y);
  return state.world.tiles[key] ?? null;
}

export function buildingAt(state, keyOrCoords) {
  const key = typeof keyOrCoords === 'string' ? keyOrCoords : tileKey(keyOrCoords.x, keyOrCoords.y);
  return Object.values(state.world.buildings).find((building) => tileKey(building.x, building.y) === key) ?? null;
}

export function roadAt(state, keyOrCoords) {
  const key = typeof keyOrCoords === 'string' ? keyOrCoords : tileKey(keyOrCoords.x, keyOrCoords.y);
  return state.networks.roads.tiles[key] ?? null;
}

export function zoneAt(state, keyOrCoords) {
  const key = typeof keyOrCoords === 'string' ? keyOrCoords : tileKey(keyOrCoords.x, keyOrCoords.y);
  return state.world.zones[key] ?? null;
}

export function placementCells(state, toolKey, startCell, endCell = startCell) {
  const tool = toolDefinition(toolKey);
  if (!startCell) return [];
  if (tool.drag === 'line') {
    return tool.kind === 'network'
      ? orthogonalPathKeys(startCell, endCell, state.world)
      : lineKeys(startCell, endCell, state.world);
  }
  if (tool.drag === 'rect') return rectKeys(startCell, endCell, state.world);
  return [tileKey(startCell.x, startCell.y)];
}

function buildingVariantForPlacement(state, tool, cell) {
  if (tool.buildingType !== 'water-system') return tool.buildingType;
  const neighbors = [
    tileAt(state, { x: cell.x + 1, y: cell.y }),
    tileAt(state, { x: cell.x - 1, y: cell.y }),
    tileAt(state, { x: cell.x, y: cell.y + 1 }),
    tileAt(state, { x: cell.x, y: cell.y - 1 }),
  ].filter(Boolean);
  return neighbors.some((neighbor) => neighbor.type === 'water') ? 'water-pump' : 'water-tower';
}

export function validatePlacement(state, toolKey, keys) {
  const tool = toolDefinition(toolKey);
  const invalid = [];
  const valid = [];
  let cost = 0;
  let buildingType = null;

  keys.forEach((key) => {
    const tile = tileAt(state, key);
    const building = buildingAt(state, key);
    const road = roadAt(state, key);
    const zone = zoneAt(state, key);

    if (!tile || tile.blocked) {
      invalid.push(key);
      return;
    }

    if (tool.kind === 'network') {
      if (tile.type === 'water' || building) {
        invalid.push(key);
        return;
      }
      valid.push(key);
      cost += road?.kind === tool.key ? 0 : tool.cost;
      return;
    }

    if (tool.kind === 'zone') {
      if (tile.type === 'water' || road || (building && !building.zoneType)) {
        invalid.push(key);
        return;
      }
      valid.push(key);
      cost += tool.cost;
      return;
    }

    if (tool.kind === 'bulldoze') {
      if (!road && !zone && !building) {
        invalid.push(key);
        return;
      }
      valid.push(key);
      return;
    }

    if (tool.kind === 'building') {
      if (tile.type === 'water' || road || zone || building) {
        invalid.push(key);
        return;
      }

      buildingType = buildingVariantForPlacement(state, tool, tile);
      const definition = BUILDING_DEFINITIONS[buildingType];
      if (!definition) {
        invalid.push(key);
        return;
      }

      if (definition.needsWaterEdge) {
        const shoreline =
          tileAt(state, { x: tile.x + 1, y: tile.y })?.type === 'water'
          || tileAt(state, { x: tile.x - 1, y: tile.y })?.type === 'water'
          || tileAt(state, { x: tile.x, y: tile.y + 1 })?.type === 'water'
          || tileAt(state, { x: tile.x, y: tile.y - 1 })?.type === 'water';
        if (!shoreline) {
          invalid.push(key);
          return;
        }
      }

      valid.push(key);
      cost += tool.cost;
    }
  });

  return {
    tool,
    valid,
    invalid,
    cost,
    buildingType,
    isValid: valid.length > 0 && invalid.length === 0,
  };
}

export function overlayValueForTile(state, key, overlay = DEFAULT_OVERLAY) {
  const tile = tileAt(state, key);
  const building = buildingAt(state, key);
  const road = roadAt(state, key);
  const hot = state.networks.heat.hotTiles.includes(key);
  const trafficRoad = state.networks.traffic.hottestRoads.find((entry) => entry.key === key);

  switch (overlay) {
    case 'traffic':
      return trafficRoad?.ratio ?? 0;
    case 'heat':
      return hot ? (building?.heatCoverage ?? 1) : 0;
    case 'power':
      return building?.powerCoverage ?? 0;
    case 'water':
      return building?.waterCoverage ?? 0;
    case 'land-value':
      return (building?.landValue ?? 0) / 100;
    case 'pollution':
      return Math.min(1, (building?.pollution ?? 0) / 20);
    case 'services':
      return Math.max(building?.serviceCoverage?.clinic ?? 0, building?.serviceCoverage?.fire ?? 0);
    default:
      return tile?.type === 'water' ? 1 : road ? 0.65 : 0;
  }
}

export function selectedEntity(state) {
  const selection = state.ui.selection;
  if (!selection) return null;
  if (selection.kind === 'building') {
    const building = state.world.buildings[selection.key] ?? null;
    return building ? { kind: 'building', building } : null;
  }

  const tile = tileAt(state, selection.key);
  return tile ? {
    kind: 'tile',
    tile,
    building: buildingAt(state, selection.key),
    road: roadAt(state, selection.key),
    zone: zoneAt(state, selection.key),
  } : null;
}

export function hudViewModel(state) {
  return {
    cityName: state.meta.cityName,
    season: currentSeason(state).label,
    temperature: Math.round(state.climate.temperature),
    money: Math.round(state.city.economy.money),
    population: state.city.population.total,
    employed: state.city.population.employed,
    hope: state.city.population.hope,
    discontent: state.city.population.discontent,
    food: Math.round(state.city.economy.food),
    fuel: Math.round(state.city.economy.fuel),
    net: Math.round(state.city.economy.net),
    overlay: overlayDefinition(state.ui.overlay).label,
  };
}
