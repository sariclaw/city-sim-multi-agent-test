import { WORLD_LAYOUT } from '../config/index.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function roadCellKey(x, y) {
  return `${x},${y}`;
}

function addRoadCell(roadMap, x, y, type = 'street', worldLayout = WORLD_LAYOUT) {
  if (x < 0 || x >= worldLayout.cols || y < 0 || y >= worldLayout.rows) return;
  const existing = roadMap.get(roadCellKey(x, y));
  const nextType = existing?.type === 'avenue' || type === 'avenue' ? 'avenue' : type;
  roadMap.set(roadCellKey(x, y), { x, y, type: nextType });
}

function addRoadPath(roadMap, start, end, type = 'street', worldLayout = WORLD_LAYOUT) {
  let x = Math.round(start.x);
  let y = Math.round(start.y);
  const targetX = Math.round(end.x);
  const targetY = Math.round(end.y);
  const horizontalFirst = Math.abs(targetX - x) >= Math.abs(targetY - y);

  addRoadCell(roadMap, x, y, type, worldLayout);
  while (x !== targetX || y !== targetY) {
    if (horizontalFirst && x !== targetX) {
      x += Math.sign(targetX - x);
    } else if (y !== targetY) {
      y += Math.sign(targetY - y);
    } else if (x !== targetX) {
      x += Math.sign(targetX - x);
    }
    addRoadCell(roadMap, x, y, type, worldLayout);
  }
}

function districtAccessPoint(layout) {
  switch (layout.frontage) {
    case 'north':
      return { x: Math.round(layout.x + layout.w * 0.5), y: layout.y - 1 };
    case 'east':
      return { x: layout.x + layout.w + 1, y: Math.round(layout.y + layout.h * 0.5) };
    case 'west':
      return { x: layout.x - 1, y: Math.round(layout.y + layout.h * 0.5) };
    case 'south':
    default:
      return { x: Math.round(layout.x + layout.w * 0.5), y: layout.y + layout.h + 1 };
  }
}

function nearestAvenueTarget(accessPoint, worldLayout = WORLD_LAYOUT) {
  const rowTargets = worldLayout.mainAvenues.rows.map((row) => ({
    x: clamp(accessPoint.x, worldLayout.waterCols + 1, worldLayout.cols - 2),
    y: row,
  }));
  const colTargets = worldLayout.mainAvenues.cols.map((col) => ({
    x: col,
    y: clamp(accessPoint.y, 1, worldLayout.rows - 2),
  }));
  const candidates = [...rowTargets, ...colTargets];
  return candidates.reduce((best, candidate) => {
    const distance = Math.abs(candidate.x - accessPoint.x) + Math.abs(candidate.y - accessPoint.y);
    if (!best || distance < best.distance) {
      return { candidate, distance };
    }
    return best;
  }, null)?.candidate ?? candidates[0];
}

export function buildWorldRoadGraph(worldLayout = WORLD_LAYOUT) {
  const roadMap = new Map();

  worldLayout.mainAvenues.rows.forEach((row) => {
    for (let x = worldLayout.waterCols; x < worldLayout.cols - 1; x += 1) {
      addRoadCell(roadMap, x, row, 'avenue', worldLayout);
    }
  });

  worldLayout.mainAvenues.cols.forEach((col) => {
    for (let y = 4; y < worldLayout.rows - 1; y += 1) {
      addRoadCell(roadMap, col, y, 'avenue', worldLayout);
    }
  });

  Object.values(worldLayout.districts).forEach((layout) => {
    const accessPoint = districtAccessPoint(layout);
    const avenueTarget = nearestAvenueTarget(accessPoint, worldLayout);
    addRoadPath(roadMap, accessPoint, avenueTarget, 'street', worldLayout);
  });

  addRoadPath(roadMap, { x: 11, y: 9 }, { x: 16, y: 9 }, 'street', worldLayout);
  addRoadPath(roadMap, { x: 10, y: 15 }, { x: 18, y: 15 }, 'street', worldLayout);

  return {
    cells: [...roadMap.values()],
    cellMap: roadMap,
  };
}

export function isWaterCell(col, row, worldLayout = WORLD_LAYOUT) {
  return col < worldLayout.waterCols + (row < 5 ? 1 : 0);
}

export function isRoadCell(col, row, worldRoads) {
  return worldRoads.cellMap.has(roadCellKey(col, row));
}

export function isDistrictCell(col, row, worldLayout = WORLD_LAYOUT) {
  return Object.values(worldLayout.districts).some((layout) => (
    col >= layout.x
    && col < layout.x + layout.w
    && row >= layout.y
    && row < layout.y + layout.h
  ));
}

export function hasAdjacentRoad(col, row, worldRoads) {
  return (
    isRoadCell(col + 1, row, worldRoads)
    || isRoadCell(col - 1, row, worldRoads)
    || isRoadCell(col, row + 1, worldRoads)
    || isRoadCell(col, row - 1, worldRoads)
  );
}

export function worldSafeArea(width, height, worldLayout = WORLD_LAYOUT) {
  return {
    left: Math.min(worldLayout.safeArea.left, width * 0.08),
    right: Math.min(worldLayout.safeArea.right, width * 0.24),
    top: Math.min(worldLayout.safeArea.top, height * 0.14),
    bottom: Math.min(worldLayout.safeArea.bottom, height * 0.22),
  };
}

export function isoProject(gridX, gridY, originX, originY, tileWidth, tileHeight) {
  return {
    x: originX + (gridX - gridY) * (tileWidth * 0.5),
    y: originY + (gridX + gridY) * (tileHeight * 0.5),
  };
}

export function worldScreenBounds(cols, rows, originX, originY, tileWidth, tileHeight) {
  const corners = [
    isoProject(0, 0, originX, originY, tileWidth, tileHeight),
    isoProject(cols - 1, 0, originX, originY, tileWidth, tileHeight),
    isoProject(cols - 1, rows - 1, originX, originY, tileWidth, tileHeight),
    isoProject(0, rows - 1, originX, originY, tileWidth, tileHeight),
  ];
  return {
    minX: Math.min(...corners.map((point) => point.x)) - tileWidth * 0.5,
    maxX: Math.max(...corners.map((point) => point.x)) + tileWidth * 0.5,
    minY: Math.min(...corners.map((point) => point.y)) - tileHeight,
    maxY: Math.max(...corners.map((point) => point.y)) + tileHeight * 2.2,
  };
}

export function cameraBoundsFromWorld(width, height, worldBounds, safeArea) {
  let minX = width - safeArea.right - 44 - worldBounds.maxX;
  let maxX = safeArea.left + 44 - worldBounds.minX;
  let minY = height - safeArea.bottom - 54 - worldBounds.maxY;
  let maxY = safeArea.top + 32 - worldBounds.minY;

  if (minX > maxX) {
    const midX = (minX + maxX) * 0.5;
    minX = midX - 120;
    maxX = midX + 120;
  }

  if (minY > maxY) {
    const midY = (minY + maxY) * 0.5;
    minY = midY - 90;
    maxY = midY + 90;
  }

  return { minX, maxX, minY, maxY };
}

export function clampCamera(camera, bounds) {
  return {
    x: clamp(camera.x, bounds.minX, bounds.maxX),
    y: clamp(camera.y, bounds.minY, bounds.maxY),
  };
}

export function terrainMetrics(width, height, camera = { x: 0, y: 0 }, worldLayout = WORLD_LAYOUT) {
  const cols = worldLayout.cols;
  const rows = worldLayout.rows;
  const safeArea = worldSafeArea(width, height, worldLayout);
  const safeWidth = Math.max(420, width - safeArea.left - safeArea.right);
  const tileWidth = Math.max(34, Math.min(58, safeWidth / ((cols + rows) * 0.56)));
  const tileHeight = tileWidth * 0.5;
  const zeroBounds = worldScreenBounds(cols, rows, 0, 0, tileWidth, tileHeight);
  const safeCenterX = safeArea.left + (width - safeArea.left - safeArea.right) * 0.5;
  const baseOriginX = safeCenterX - (zeroBounds.minX + zeroBounds.maxX) * 0.5;
  const baseOriginY = safeArea.top + 40 - zeroBounds.minY;
  const baseWorldBounds = worldScreenBounds(cols, rows, baseOriginX, baseOriginY, tileWidth, tileHeight);
  const cameraBounds = cameraBoundsFromWorld(width, height, baseWorldBounds, safeArea);
  const clampedCamera = clampCamera(camera, cameraBounds);

  return {
    cols,
    rows,
    tileWidth,
    tileHeight,
    originX: baseOriginX + clampedCamera.x,
    originY: baseOriginY + clampedCamera.y,
    baseOriginX,
    baseOriginY,
    camera: clampedCamera,
    cameraBounds,
    safeArea,
  };
}

export function pointInPolygon(point, points) {
  let inside = false;
  for (let current = 0, previous = points.length - 1; current < points.length; previous = current, current += 1) {
    const a = points[current];
    const b = points[previous];
    const intersects =
      ((a.y > point.y) !== (b.y > point.y))
      && (point.x < ((b.x - a.x) * (point.y - a.y)) / Math.max(0.0001, (b.y - a.y)) + a.x);
    if (intersects) inside = !inside;
  }
  return inside;
}

export function districtIsoFootprint(district, metrics) {
  const center = isoProject(
    district.x + district.w * 0.5,
    district.y + district.h * 0.5,
    metrics.originX,
    metrics.originY,
    metrics.tileWidth,
    metrics.tileHeight,
  );
  return {
    centerX: center.x,
    centerY: center.y,
    width: metrics.tileWidth * (district.w + district.h) * 0.9,
    height: metrics.tileHeight * (district.w + district.h) * 0.86,
    tileWidth: metrics.tileWidth * district.w,
    tileHeight: metrics.tileHeight * district.h,
  };
}

export function districtScreenFrame(district, metrics) {
  const top = isoProject(district.x, district.y, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);
  const right = isoProject(district.x + district.w, district.y, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);
  const bottom = isoProject(district.x + district.w, district.y + district.h, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);
  const left = isoProject(district.x, district.y + district.h, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);
  const points = [top, right, bottom, left];
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
    points,
    center: isoProject(
      district.x + district.w * 0.5,
      district.y + district.h * 0.5,
      metrics.originX,
      metrics.originY,
      metrics.tileWidth,
      metrics.tileHeight,
    ),
  };
}
