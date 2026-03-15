export function tileKey(x, y) {
  return `${x},${y}`;
}

export function parseTileKey(key) {
  const [x, y] = key.split(',').map(Number);
  return { x, y, key };
}

export function cardinalNeighbors(x, y) {
  return [
    { x: x + 1, y },
    { x: x - 1, y },
    { x, y: y + 1 },
    { x, y: y - 1 },
  ];
}

export function allNeighbors(x, y) {
  const neighbors = [];
  for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
    for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
      if (!offsetX && !offsetY) continue;
      neighbors.push({ x: x + offsetX, y: y + offsetY });
    }
  }
  return neighbors;
}

export function insideWorld(x, y, world) {
  return x >= 0 && x < world.cols && y >= 0 && y < world.rows;
}

export function manhattanDistance(a, b) {
  return Math.abs(a.x - b.x) + Math.abs(a.y - b.y);
}

export function circleKeys(centerX, centerY, radius, world) {
  const keys = [];
  for (let y = centerY - radius; y <= centerY + radius; y += 1) {
    for (let x = centerX - radius; x <= centerX + radius; x += 1) {
      if (!insideWorld(x, y, world)) continue;
      if (manhattanDistance({ x, y }, { x: centerX, y: centerY }) <= radius) {
        keys.push(tileKey(x, y));
      }
    }
  }
  return keys;
}

export function rectKeys(start, end, world) {
  const minX = Math.max(0, Math.min(start.x, end.x));
  const maxX = Math.min(world.cols - 1, Math.max(start.x, end.x));
  const minY = Math.max(0, Math.min(start.y, end.y));
  const maxY = Math.min(world.rows - 1, Math.max(start.y, end.y));
  const keys = [];

  for (let y = minY; y <= maxY; y += 1) {
    for (let x = minX; x <= maxX; x += 1) {
      keys.push(tileKey(x, y));
    }
  }

  return keys;
}

export function lineKeys(start, end, world) {
  const keys = [];
  let x = start.x;
  let y = start.y;
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  const sx = start.x < end.x ? 1 : -1;
  const sy = start.y < end.y ? 1 : -1;
  let error = dx - dy;

  while (true) {
    if (insideWorld(x, y, world)) keys.push(tileKey(x, y));
    if (x === end.x && y === end.y) break;
    const error2 = error * 2;
    if (error2 > -dy) {
      error -= dy;
      x += sx;
    }
    if (error2 < dx) {
      error += dx;
      y += sy;
    }
  }

  return [...new Set(keys)];
}

export function orthogonalPathKeys(start, end, world) {
  const horizontalFirst = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  const bend = horizontalFirst
    ? { x: end.x, y: start.y }
    : { x: start.x, y: end.y };

  return [...new Set([
    ...lineKeys(start, bend, world),
    ...lineKeys(bend, end, world),
  ])];
}

export function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}
