import {
  MAP_ZOOM_DEFAULT,
  MAP_ZOOM_MAX,
  MAP_ZOOM_MIN,
  WORLD_LAYOUT,
} from '../config/index.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

export function clampZoom(zoom = MAP_ZOOM_DEFAULT) {
  const numericZoom = Number(zoom);
  return clamp(
    Number.isFinite(numericZoom) ? numericZoom : MAP_ZOOM_DEFAULT,
    MAP_ZOOM_MIN,
    MAP_ZOOM_MAX,
  );
}

export function roadCellKey(x, y) {
  return `${x},${y}`;
}

export function districtTerritory(layout) {
  if (layout?.territory) {
    return {
      x: layout.territory.x,
      y: layout.territory.y,
      w: layout.territory.w,
      h: layout.territory.h,
    };
  }

  return {
    x: layout?.x ?? 0,
    y: layout?.y ?? 0,
    w: layout?.w ?? 0,
    h: layout?.h ?? 0,
  };
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

export function districtAccessPoint(layout) {
  const territory = districtTerritory(layout);
  switch (layout.frontage) {
    case 'north':
      return { x: Math.round(territory.x + territory.w * 0.5), y: territory.y - 1 };
    case 'east':
      return { x: territory.x + territory.w, y: Math.round(territory.y + territory.h * 0.5) };
    case 'west':
      return { x: territory.x - 1, y: Math.round(territory.y + territory.h * 0.5) };
    case 'south':
    default:
      return { x: Math.round(territory.x + territory.w * 0.5), y: territory.y + territory.h };
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

  (worldLayout.connectorStreets ?? []).forEach((street) => {
    addRoadPath(roadMap, street.start, street.end, street.type ?? 'street', worldLayout);
  });

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
  return Object.values(worldLayout.districts).some((layout) => {
    const territory = districtTerritory(layout);
    return (
      col >= territory.x
      && col < territory.x + territory.w
      && row >= territory.y
      && row < territory.y + territory.h
    );
  });
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

export function screenToIsoGrid(screenX, screenY, metrics) {
  const localX = screenX - metrics.originX;
  const localY = screenY - metrics.originY;
  return {
    x: localX / metrics.tileWidth + localY / metrics.tileHeight,
    y: localY / metrics.tileHeight - localX / metrics.tileWidth,
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

export function terrainMetrics(
  width,
  height,
  camera = { x: 0, y: 0 },
  worldLayout = WORLD_LAYOUT,
  zoom = MAP_ZOOM_DEFAULT,
) {
  const cols = worldLayout.cols;
  const rows = worldLayout.rows;
  const safeArea = worldSafeArea(width, height, worldLayout);
  const safeWidth = Math.max(420, width - safeArea.left - safeArea.right);
  const baseTileWidth = Math.max(34, Math.min(58, safeWidth / ((cols + rows) * 0.56)));
  const tileWidth = baseTileWidth * clampZoom(zoom);
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
  function pointOnSegment(a, b) {
    const cross = (point.y - a.y) * (b.x - a.x) - (point.x - a.x) * (b.y - a.y);
    if (Math.abs(cross) > 0.01) return false;

    return (
      point.x >= Math.min(a.x, b.x) - 0.01
      && point.x <= Math.max(a.x, b.x) + 0.01
      && point.y >= Math.min(a.y, b.y) - 0.01
      && point.y <= Math.max(a.y, b.y) + 0.01
    );
  }

  function isLeft(a, b) {
    return (b.x - a.x) * (point.y - a.y) - (point.x - a.x) * (b.y - a.y);
  }

  let winding = 0;
  for (let current = 0, previous = points.length - 1; current < points.length; previous = current, current += 1) {
    const a = points[previous];
    const b = points[current];

    if (pointOnSegment(a, b)) return true;

    if (a.y <= point.y) {
      if (b.y > point.y && isLeft(a, b) > 0) winding += 1;
    } else if (b.y <= point.y && isLeft(a, b) < 0) {
      winding -= 1;
    }
  }
  return winding !== 0;
}

function rectCellKeys(rect) {
  const territory = districtTerritory(rect);
  const cells = [];
  for (let y = territory.y; y < territory.y + territory.h; y += 1) {
    for (let x = territory.x; x < territory.x + territory.w; x += 1) {
      cells.push(roadCellKey(x, y));
    }
  }
  return cells;
}

function parseCellKey(key) {
  const [x, y] = key.split(',').map(Number);
  return { x, y, key: roadCellKey(x, y) };
}

function screenPointKey(point) {
  return `${Math.round(point.x * 1000)}:${Math.round(point.y * 1000)}`;
}

function simplifyPolygon(points) {
  if (points.length <= 3) return points;

  return points.filter((point, index) => {
    const previous = points[(index + points.length - 1) % points.length];
    const next = points[(index + 1) % points.length];
    const cross =
      (point.x - previous.x) * (next.y - point.y)
      - (point.y - previous.y) * (next.x - point.x);
    return Math.abs(cross) > 0.01;
  });
}

function componentCellKeys(cellKeys) {
  const pending = new Set(cellKeys);
  const components = [];

  while (pending.size) {
    const seedKey = pending.values().next().value;
    const stack = [seedKey];
    const component = [];
    pending.delete(seedKey);

    while (stack.length) {
      const key = stack.pop();
      const cell = parseCellKey(key);
      component.push(cell);

      [
        roadCellKey(cell.x + 1, cell.y),
        roadCellKey(cell.x - 1, cell.y),
        roadCellKey(cell.x, cell.y + 1),
        roadCellKey(cell.x, cell.y - 1),
      ].forEach((neighborKey) => {
        if (!pending.has(neighborKey)) return;
        pending.delete(neighborKey);
        stack.push(neighborKey);
      });
    }

    components.push(component);
  }

  return components;
}

function diamondPointsForCell(cell, metrics) {
  const center = isoProject(cell.x, cell.y, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);
  return [
    { x: center.x, y: center.y - metrics.tileHeight * 0.5 },
    { x: center.x + metrics.tileWidth * 0.5, y: center.y },
    { x: center.x, y: center.y + metrics.tileHeight * 0.5 },
    { x: center.x - metrics.tileWidth * 0.5, y: center.y },
  ];
}

function edgeKey(start, end) {
  return `${screenPointKey(start)}>${screenPointKey(end)}`;
}

function traceBoundaryPolygons(boundaryEdges) {
  const edges = new Map(boundaryEdges);
  const outgoing = new Map();

  edges.forEach((edge, key) => {
    const startKey = screenPointKey(edge.start);
    const list = outgoing.get(startKey) ?? [];
    list.push(key);
    outgoing.set(startKey, list);
  });

  function removeEdge(key) {
    const edge = edges.get(key);
    if (!edge) return null;
    edges.delete(key);
    const startKey = screenPointKey(edge.start);
    const list = outgoing.get(startKey) ?? [];
    const nextList = list.filter((candidate) => candidate !== key);
    if (nextList.length) outgoing.set(startKey, nextList);
    else outgoing.delete(startKey);
    return edge;
  }

  const polygons = [];
  while (edges.size) {
    const [firstKey] = edges.entries().next().value;
    const firstEdge = removeEdge(firstKey);
    if (!firstEdge) continue;

    const polygon = [firstEdge.start];
    const startKey = screenPointKey(firstEdge.start);
    let cursor = firstEdge.end;
    let guard = 0;

    while (screenPointKey(cursor) !== startKey && guard < 10000) {
      polygon.push(cursor);
      const nextKey = (outgoing.get(screenPointKey(cursor)) ?? []).find((candidate) => edges.has(candidate));
      if (!nextKey) break;
      const nextEdge = removeEdge(nextKey);
      if (!nextEdge) break;
      cursor = nextEdge.end;
      guard += 1;
    }

    const simplified = simplifyPolygon(polygon);
    if (simplified.length >= 3) polygons.push(simplified);
  }

  return polygons;
}

export function cellKeysIsoPolygons(cellKeys, metrics) {
  const uniqueCellKeys = [...new Set([...cellKeys].filter(Boolean))];
  if (!uniqueCellKeys.length) return [];

  return componentCellKeys(uniqueCellKeys).flatMap((component) => {
    const boundaryEdges = new Map();

    component.forEach((cell) => {
      const diamond = diamondPointsForCell(cell, metrics);
      for (let index = 0; index < diamond.length; index += 1) {
        const start = diamond[index];
        const end = diamond[(index + 1) % diamond.length];
        const forwardKey = edgeKey(start, end);
        const reverseKey = edgeKey(end, start);
        if (boundaryEdges.has(reverseKey)) {
          boundaryEdges.delete(reverseKey);
          continue;
        }
        boundaryEdges.set(forwardKey, { start, end });
      }
    });

    return traceBoundaryPolygons(boundaryEdges);
  });
}

export function rectIsoPolygon(rect, metrics) {
  return cellKeysIsoPolygons(rectCellKeys(rect), metrics)[0] ?? [];
}

export function footprintAnchorPoint(rect, metrics) {
  const territory = districtTerritory(rect);
  const frontCell = isoProject(
    territory.x + territory.w - 1,
    territory.y + territory.h - 1,
    metrics.originX,
    metrics.originY,
    metrics.tileWidth,
    metrics.tileHeight,
  );
  return {
    x: frontCell.x,
    y: frontCell.y + metrics.tileHeight * 0.5,
  };
}

function districtPolygons(district, metrics) {
  if (district.surfaceCellKeys?.length) {
    return cellKeysIsoPolygons(district.surfaceCellKeys, metrics);
  }

  if (district.cellKeys?.length) {
    return cellKeysIsoPolygons(district.cellKeys, metrics);
  }

  const territory = districtTerritory(district);
  return (district.plots?.length ? district.plots : [territory])
    .map((plot) => rectIsoPolygon(plot, metrics))
    .filter((polygon) => polygon.length >= 3);
}

export function polygonsScreenFrame(polygons) {
  const points = polygons.flat();
  const minX = Math.min(...points.map((point) => point.x));
  const maxX = Math.max(...points.map((point) => point.x));
  const minY = Math.min(...points.map((point) => point.y));
  const maxY = Math.max(...points.map((point) => point.y));
  return {
    x: minX,
    y: minY,
    w: maxX - minX,
    h: maxY - minY,
    center: {
      x: minX + (maxX - minX) * 0.5,
      y: minY + (maxY - minY) * 0.5,
    },
  };
}

export function districtIsoFootprint(district, metrics) {
  const territory = districtTerritory(district);
  const polygons = districtPolygons(district, metrics);
  const frame = polygonsScreenFrame(polygons);
  const center = isoProject(
    territory.x + territory.w * 0.5,
    territory.y + territory.h * 0.5,
    metrics.originX,
    metrics.originY,
    metrics.tileWidth,
    metrics.tileHeight,
  );
  return {
    centerX: center.x,
    centerY: center.y,
    width: frame.w,
    height: frame.h,
    tileWidth: metrics.tileWidth * territory.w,
    tileHeight: metrics.tileHeight * territory.h,
    polygons,
  };
}

export function districtScreenFrame(district, metrics) {
  const territory = districtTerritory(district);
  const polygons = districtPolygons(district, metrics);
  const frame = polygonsScreenFrame(polygons);
  return {
    x: frame.x,
    y: frame.y,
    w: frame.w,
    h: frame.h,
    points: polygons[0] ?? [],
    polygons,
    center: isoProject(
      territory.x + territory.w * 0.5,
      territory.y + territory.h * 0.5,
      metrics.originX,
      metrics.originY,
      metrics.tileWidth,
      metrics.tileHeight,
    ),
  };
}
