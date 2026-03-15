import { cellIsoPolygon, pointInPolygon, screenToIsoGrid } from './terrain.js';

function roadConnections(roads, x, y) {
  const north = roads[`${x},${y - 1}`];
  const south = roads[`${x},${y + 1}`];
  const east = roads[`${x + 1},${y}`];
  const west = roads[`${x - 1},${y}`];
  return { north, south, east, west };
}

export function roadConnectionMask(roads, key) {
  const [x, y] = key.split(',').map(Number);
  const links = roadConnections(roads, x, y);
  return {
    north: Boolean(links.north),
    east: Boolean(links.east),
    south: Boolean(links.south),
    west: Boolean(links.west),
  };
}

export function roadVariantForKey(roads, key) {
  const mask = roadConnectionMask(roads, key);
  const count = Number(mask.north) + Number(mask.east) + Number(mask.south) + Number(mask.west);

  if (count === 4) return 'cross';
  if (count === 3) {
    if (!mask.north) return 'tee-n';
    if (!mask.east) return 'tee-e';
    if (!mask.south) return 'tee-s';
    return 'tee-w';
  }
  if (count === 2) {
    if (mask.north && mask.south) return 'straight-ns';
    if (mask.east && mask.west) return 'straight-ew';
    if (mask.north && mask.east) return 'curve-ne';
    if (mask.east && mask.south) return 'curve-es';
    if (mask.south && mask.west) return 'curve-sw';
    return 'curve-wn';
  }
  if (count === 1) {
    if (mask.north) return 'end-n';
    if (mask.east) return 'end-e';
    if (mask.south) return 'end-s';
    return 'end-w';
  }
  return 'isolated';
}

export function pickTileFromPoint(screenX, screenY, world, metrics) {
  const approximate = screenToIsoGrid(screenX, screenY, metrics);
  const baseX = Math.floor(approximate.x);
  const baseY = Math.floor(approximate.y);

  for (let y = baseY - 1; y <= baseY + 1; y += 1) {
    for (let x = baseX - 1; x <= baseX + 1; x += 1) {
      if (x < 0 || x >= world.cols || y < 0 || y >= world.rows) continue;
      const polygon = cellIsoPolygon(x, y, metrics, world.tiles[`${x},${y}`]?.height ?? 0);
      if (pointInPolygon({ x: screenX, y: screenY }, polygon)) {
        return { x, y, key: `${x},${y}` };
      }
    }
  }

  return null;
}
