import { WORLD_LAYOUT } from '../config/index.js';
import {
  buildWorldRoadGraph,
  districtAccessPoint,
  districtTerritory,
  isWaterCell,
} from './terrain.js';

export function cellKey(x, y) {
  return `${x},${y}`;
}

function contiguousSegments(values) {
  if (!values.length) return [];

  const segments = [];
  let start = values[0];
  let previous = values[0];

  for (let index = 1; index < values.length; index += 1) {
    const value = values[index];
    if (value === previous + 1) {
      previous = value;
      continue;
    }

    segments.push({ x: start, w: previous - start + 1 });
    start = value;
    previous = value;
  }

  segments.push({ x: start, w: previous - start + 1 });
  return segments;
}

function mergeSegmentsIntoPlots(segmentsByRow) {
  const rows = [...segmentsByRow.keys()].sort((left, right) => left - right);
  const plots = [];
  let active = new Map();

  rows.forEach((row) => {
    const nextActive = new Map();
    const segments = segmentsByRow.get(row) ?? [];

    segments.forEach((segment) => {
      const segmentKey = `${segment.x}:${segment.w}`;
      const existing = active.get(segmentKey);
      if (existing) {
        existing.h += 1;
        nextActive.set(segmentKey, existing);
        active.delete(segmentKey);
        return;
      }

      nextActive.set(segmentKey, {
        x: segment.x,
        y: row,
        w: segment.w,
        h: 1,
      });
    });

    active.forEach((plot) => plots.push(plot));
    active = nextActive;
  });

  active.forEach((plot) => plots.push(plot));
  return plots;
}

export function buildRectsFromCellKeys(cellKeys) {
  const segmentsByRow = new Map();

  cellKeys.forEach((key) => {
    const [x, y] = key.split(',').map(Number);
    const row = segmentsByRow.get(y) ?? [];
    row.push(x);
    segmentsByRow.set(y, row);
  });

  segmentsByRow.forEach((values, row) => {
    values.sort((left, right) => left - right);
    segmentsByRow.set(row, contiguousSegments(values));
  });

  return mergeSegmentsIntoPlots(segmentsByRow).sort((left, right) => {
    const leftArea = left.w * left.h;
    const rightArea = right.w * right.h;
    if (leftArea !== rightArea) return rightArea - leftArea;
    if (left.y !== right.y) return left.y - right.y;
    return left.x - right.x;
  });
}

function frontageSetbackCells(territory, frontage) {
  const reserved = new Set();

  switch (frontage) {
    case 'north':
      for (let x = territory.x; x < territory.x + territory.w; x += 1) {
        reserved.add(cellKey(x, territory.y));
      }
      break;
    case 'east':
      for (let y = territory.y; y < territory.y + territory.h; y += 1) {
        reserved.add(cellKey(territory.x + territory.w - 1, y));
      }
      break;
    case 'west':
      for (let y = territory.y; y < territory.y + territory.h; y += 1) {
        reserved.add(cellKey(territory.x, y));
      }
      break;
    case 'south':
    default:
      for (let x = territory.x; x < territory.x + territory.w; x += 1) {
        reserved.add(cellKey(x, territory.y + territory.h - 1));
      }
      break;
  }

  return reserved;
}

function districtCenterFromPlots(plots, territory) {
  const reference = plots[0] ?? territory;
  return {
    x: reference.x + reference.w * 0.5,
    y: reference.y + reference.h * 0.5,
  };
}

function buildDistrictGeometry(key, layout, worldLayout, worldRoads, roadCellSet) {
  const territory = districtTerritory(layout);
  const frontage = layout.frontage ?? 'south';
  const setbackCells = frontageSetbackCells(territory, frontage);
  const reservedCells = new Map();
  const buildableCells = new Set();

  for (let y = territory.y; y < territory.y + territory.h; y += 1) {
    for (let x = territory.x; x < territory.x + territory.w; x += 1) {
      const keyForCell = cellKey(x, y);
      if (isWaterCell(x, y, worldLayout)) {
        reservedCells.set(keyForCell, 'water');
        continue;
      }
      if (roadCellSet.has(keyForCell)) {
        reservedCells.set(keyForCell, 'road');
        continue;
      }
      if (setbackCells.has(keyForCell)) {
        reservedCells.set(keyForCell, 'frontage');
        continue;
      }
      buildableCells.add(keyForCell);
    }
  }

  const plots = buildRectsFromCellKeys(buildableCells);

  return {
    key,
    territory,
    frontage,
    accessPoint: districtAccessPoint(layout),
    buildableCells,
    plots,
    reservedCells,
    labelCenter: districtCenterFromPlots(plots, territory),
    roadCellsInTerritory: [...reservedCells.entries()]
      .filter(([, reason]) => reason === 'road')
      .map(([reservedKey]) => reservedKey),
    depth: isoFrontDepth(territory.x, territory.y, territory.w, territory.h),
    worldRoads,
  };
}

export function isoFrontDepth(x, y, width = 1, height = 1) {
  return x + y + height + width * 0.5;
}

export function rectFootprintCells(rect) {
  const cells = [];
  for (let y = rect.y; y < rect.y + rect.h; y += 1) {
    for (let x = rect.x; x < rect.x + rect.w; x += 1) {
      cells.push({ x, y, key: cellKey(x, y) });
    }
  }
  return cells;
}

export function createWorldGeometry(worldLayout = WORLD_LAYOUT, worldRoads = buildWorldRoadGraph(worldLayout)) {
  const roadCellSet = new Set(worldRoads.cells.map((cell) => cellKey(cell.x, cell.y)));
  const districts = Object.fromEntries(
    Object.entries(worldLayout.districts).map(([key, layout]) => [
      key,
      buildDistrictGeometry(key, layout, worldLayout, worldRoads, roadCellSet),
    ]),
  );

  return {
    roadCellSet,
    worldLayout,
    worldRoads,
    districts,
  };
}
