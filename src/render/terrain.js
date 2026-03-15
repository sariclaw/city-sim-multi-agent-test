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
  const numeric = Number(zoom);
  return clamp(Number.isFinite(numeric) ? numeric : MAP_ZOOM_DEFAULT, MAP_ZOOM_MIN, MAP_ZOOM_MAX);
}

export function isoProject(gridX, gridY, originX, originY, tileWidth, tileHeight, elevation = 0) {
  return {
    x: originX + (gridX - gridY) * tileWidth * 0.5,
    y: originY + (gridX + gridY) * tileHeight * 0.5 - elevation * tileHeight * 0.65,
  };
}

export function cellIsoPolygon(x, y, metrics, elevation = 0) {
  const center = isoProject(x, y, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight, elevation);
  return [
    { x: center.x, y: center.y - metrics.tileHeight * 0.5 },
    { x: center.x + metrics.tileWidth * 0.5, y: center.y },
    { x: center.x, y: center.y + metrics.tileHeight * 0.5 },
    { x: center.x - metrics.tileWidth * 0.5, y: center.y },
  ];
}

export function rectIsoPolygon(rect, metrics, elevation = 0) {
  const top = cellIsoPolygon(rect.x, rect.y, metrics, elevation)[0];
  const right = cellIsoPolygon(rect.x + rect.w - 1, rect.y, metrics, elevation)[1];
  const bottom = cellIsoPolygon(rect.x + rect.w - 1, rect.y + rect.h - 1, metrics, elevation)[2];
  const left = cellIsoPolygon(rect.x, rect.y + rect.h - 1, metrics, elevation)[3];
  return [top, right, bottom, left];
}

export function pointInPolygon(point, polygon) {
  let inside = false;
  for (let current = 0, previous = polygon.length - 1; current < polygon.length; previous = current, current += 1) {
    const xi = polygon[current].x;
    const yi = polygon[current].y;
    const xj = polygon[previous].x;
    const yj = polygon[previous].y;

    const intersect = ((yi > point.y) !== (yj > point.y))
      && (point.x < ((xj - xi) * (point.y - yi)) / ((yj - yi) || 1e-6) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

export function screenToIsoGrid(screenX, screenY, metrics) {
  const localX = screenX - metrics.originX;
  const localY = screenY - metrics.originY;
  return {
    x: localX / metrics.tileWidth + localY / metrics.tileHeight,
    y: localY / metrics.tileHeight - localX / metrics.tileWidth,
  };
}

export function worldSafeArea(width, height, layout = WORLD_LAYOUT) {
  return {
    left: Math.min(layout.safeArea.left, width * 0.08),
    right: Math.min(layout.safeArea.right, width * 0.28),
    top: Math.min(layout.safeArea.top, height * 0.14),
    bottom: Math.min(layout.safeArea.bottom, height * 0.22),
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
  let minX = width - safeArea.right - 42 - worldBounds.maxX;
  let maxX = safeArea.left + 42 - worldBounds.minX;
  let minY = height - safeArea.bottom - 52 - worldBounds.maxY;
  let maxY = safeArea.top + 28 - worldBounds.minY;

  if (minX > maxX) {
    const midpoint = (minX + maxX) * 0.5;
    minX = midpoint - 100;
    maxX = midpoint + 100;
  }

  if (minY > maxY) {
    const midpoint = (minY + maxY) * 0.5;
    minY = midpoint - 90;
    maxY = midpoint + 90;
  }

  return { minX, maxX, minY, maxY };
}

export function clampCamera(camera, bounds) {
  return {
    x: clamp(camera.x, bounds.minX, bounds.maxX),
    y: clamp(camera.y, bounds.minY, bounds.maxY),
  };
}

export function terrainMetrics(width, height, camera = { x: 0, y: 0 }, layout = WORLD_LAYOUT, zoom = MAP_ZOOM_DEFAULT) {
  const safeArea = worldSafeArea(width, height, layout);
  const safeWidth = Math.max(520, width - safeArea.left - safeArea.right);
  const baseTileWidth = Math.max(28, Math.min(48, safeWidth / ((layout.cols + layout.rows) * 0.62)));
  const tileWidth = baseTileWidth * clampZoom(zoom);
  const tileHeight = tileWidth * 0.5;
  const zeroBounds = worldScreenBounds(layout.cols, layout.rows, 0, 0, tileWidth, tileHeight);
  const centerX = safeArea.left + (width - safeArea.left - safeArea.right) * 0.5;
  const baseOriginX = centerX - (zeroBounds.minX + zeroBounds.maxX) * 0.5;
  const baseOriginY = safeArea.top + 54 - zeroBounds.minY;
  const baseBounds = worldScreenBounds(layout.cols, layout.rows, baseOriginX, baseOriginY, tileWidth, tileHeight);
  const cameraBounds = cameraBoundsFromWorld(width, height, baseBounds, safeArea);
  const clampedCamera = clampCamera(camera, cameraBounds);

  return {
    cols: layout.cols,
    rows: layout.rows,
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
