import { BUDGET_LIMITS, TAX_RATE_LIMITS, TOOL_DEFINITIONS } from '../config/index.js';
import { clamp, tileKey } from './tile-utils.js';
import {
  buildingAt,
  placementCells,
  selectedEntity,
  tileAt,
  validatePlacement,
  zoneAt,
} from './selectors.js';

function setSelectionForCell(state, key) {
  const building = buildingAt(state, key);
  state.ui.selection = building
    ? { kind: 'building', key: building.id }
    : { kind: 'tile', key };
}

function clearZoneBuilding(state, key) {
  const zoneBuildingId = `zone-${key.replace(',', '-')}`;
  delete state.world.buildings[zoneBuildingId];
}

export function selectToolCommand(state, toolKey) {
  const tool = TOOL_DEFINITIONS.find((entry) => entry.key === toolKey);
  if (!tool) return false;
  state.ui.tool = toolKey;
  state.ui.preview = null;
  return true;
}

export function updateCursorCellCommand(state, cell) {
  state.ui.hoveredCell = cell ? { x: cell.x, y: cell.y, key: tileKey(cell.x, cell.y) } : null;
}

export function beginPlacementPreviewCommand(state, cell) {
  if (!cell) return false;
  state.ui.preview = {
    start: { x: cell.x, y: cell.y },
    end: { x: cell.x, y: cell.y },
    cells: [],
    valid: false,
    cost: 0,
    tool: state.ui.tool,
  };
  return true;
}

export function updatePlacementPreviewCommand(state, cell) {
  if (!state.ui.preview || !cell) return false;
  state.ui.preview.end = { x: cell.x, y: cell.y };
  state.ui.preview.cells = placementCells(state, state.ui.tool, state.ui.preview.start, state.ui.preview.end);
  const validation = validatePlacement(state, state.ui.tool, state.ui.preview.cells);
  state.ui.preview.valid = validation.isValid && state.city.economy.money >= validation.cost;
  state.ui.preview.cost = validation.cost;
  state.ui.preview.invalid = validation.invalid;
  state.ui.preview.buildingType = validation.buildingType;
  return true;
}

export function cancelPlacementPreviewCommand(state) {
  state.ui.preview = null;
}

export function paintZoneCommand(state, key, zoneType) {
  const tile = tileAt(state, key);
  if (!tile || tile.type === 'water' || tile.blocked) return false;
  state.world.zones[key] = {
    type: zoneType,
    density: 'low',
    progress: zoneAt(state, key)?.progress ?? 0,
  };
  clearZoneBuilding(state, key);
  return true;
}

export function bulldozeAtCommand(state, key) {
  delete state.networks.roads.tiles[key];
  delete state.world.zones[key];
  clearZoneBuilding(state, key);

  Object.entries(state.world.buildings).forEach(([id, building]) => {
    if (tileKey(building.x, building.y) === key) delete state.world.buildings[id];
  });

  return true;
}

export function commitPlacementCommand(state) {
  const preview = state.ui.preview;
  if (!preview) return false;
  const validation = validatePlacement(state, state.ui.tool, preview.cells);
  if (!validation.isValid || state.city.economy.money < validation.cost) {
    state.ui.preview = { ...preview, valid: false, invalid: validation.invalid, cost: validation.cost };
    return false;
  }

  validation.valid.forEach((key) => {
    if (validation.tool.kind === 'network') {
      state.networks.roads.tiles[key] = {
        kind: validation.tool.key,
        variant: 'cross',
        load: 0,
      };
    }

    if (validation.tool.kind === 'zone') {
      paintZoneCommand(state, key, validation.tool.zoneType);
    }

    if (validation.tool.kind === 'bulldoze') {
      bulldozeAtCommand(state, key);
    }

    if (validation.tool.kind === 'building') {
      const [x, y] = key.split(',').map(Number);
      const id = `build-${validation.buildingType}-${x}-${y}-${state.simulation.tick}`;
      state.world.buildings[id] = {
        id,
        type: validation.buildingType,
        x,
        y,
        residents: 0,
        jobs: 0,
        workers: 0,
        occupancy: 0,
        health: 1,
        status: 'Constructed',
      };
    }

    setSelectionForCell(state, key);
  });

  state.city.economy.money -= validation.cost;
  state.ui.preview = null;
  return true;
}

export function setOverlayModeCommand(state, overlayKey) {
  state.ui.overlay = overlayKey;
}

export function setBudgetCommand(state, budgetKey, nextValue) {
  if (!(budgetKey in state.city.economy.budget)) return false;
  state.city.economy.budget[budgetKey] = clamp(nextValue, BUDGET_LIMITS.min, BUDGET_LIMITS.max);
  return true;
}

export function setTaxRateCommand(state, taxKey, nextValue) {
  if (!(taxKey in state.city.economy.taxes)) return false;
  state.city.economy.taxes[taxKey] = clamp(nextValue, TAX_RATE_LIMITS.min, TAX_RATE_LIMITS.max);
  return true;
}

export function togglePolicyCommand(state, policyKey) {
  if (!(policyKey in state.city.policies)) return false;
  state.city.policies[policyKey] = !state.city.policies[policyKey];
  return state.city.policies[policyKey];
}

export function selectEntityAtCommand(state, key) {
  setSelectionForCell(state, key);
  return selectedEntity(state);
}
