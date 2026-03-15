import { cardinalNeighbors, tileKey } from '../tile-utils.js';
import { getPolicyModifiers } from './policy-system.js';

function roadPath(startKey, endKey, roadTiles) {
  if (!startKey || !endKey || startKey === endKey) return startKey && endKey ? [startKey] : [];
  const queue = [startKey];
  const previous = new Map([[startKey, null]]);

  while (queue.length) {
    const key = queue.shift();
    if (key === endKey) break;
    const [x, y] = key.split(',').map(Number);
    cardinalNeighbors(x, y).forEach((neighbor) => {
      const neighborKey = tileKey(neighbor.x, neighbor.y);
      if (!roadTiles[neighborKey] || previous.has(neighborKey)) return;
      previous.set(neighborKey, key);
      queue.push(neighborKey);
    });
  }

  if (!previous.has(endKey)) return [];
  const path = [];
  let current = endKey;
  while (current) {
    path.unshift(current);
    current = previous.get(current) ?? null;
  }
  return path;
}

function nearestTarget(startRoad, candidates, roadTiles) {
  const viable = candidates
    .map((candidate) => ({
      candidate,
      path: roadPath(startRoad, candidate.connectedRoad, roadTiles),
    }))
    .filter((entry) => entry.path.length);

  viable.sort((left, right) => left.path.length - right.path.length);
  return viable[0] ?? null;
}

export function recomputeTraffic(state) {
  const roadTiles = state.networks.roads.tiles;
  const buildings = Object.values(state.world.buildings);
  const modifiers = getPolicyModifiers(state);

  Object.values(roadTiles).forEach((road) => {
    road.load = 0;
  });

  const employers = buildings.filter((building) => building.connectedRoad && building.jobs > 0);
  const commerce = buildings.filter((building) => building.connectedRoad && building.zoneType === 'commercial' && building.jobs > 0);
  const hottestRoads = [];

  buildings
    .filter((building) => building.zoneType === 'residential' && building.connectedRoad && building.residents > 0)
    .forEach((home) => {
      const commuterCount = Math.round(home.residents * 0.56 * modifiers.trafficMultiplier);
      const targetEntry = nearestTarget(
        home.connectedRoad,
        employers.filter((building) => (building._remainingJobs ?? building.jobs) > 0),
        roadTiles,
      );

      if (!targetEntry) return;
      const target = targetEntry.candidate;
      const assigned = Math.min(commuterCount, target._remainingJobs ?? target.jobs);
      target._remainingJobs = (target._remainingJobs ?? target.jobs) - assigned;
      targetEntry.path.forEach((key) => {
        roadTiles[key].load += assigned;
      });
    });

  buildings
    .filter((building) => building.zoneType === 'industrial' && building.connectedRoad && building.workers > 0)
    .forEach((source) => {
      const freight = Math.round(source.workers * 0.35);
      const targetEntry = nearestTarget(source.connectedRoad, commerce, roadTiles);
      if (!targetEntry) return;
      targetEntry.path.forEach((key) => {
        roadTiles[key].load += freight;
      });
    });

  Object.entries(roadTiles).forEach(([key, road]) => {
    const ratio = road.capacity ? road.load / road.capacity : 0;
    if (ratio <= 0) return;
    hottestRoads.push({
      key,
      kind: road.kind,
      load: road.load,
      ratio,
    });
  });

  hottestRoads.sort((left, right) => right.ratio - left.ratio);
  state.networks.traffic = {
    averageLoad: hottestRoads.length
      ? hottestRoads.reduce((sum, road) => sum + road.ratio, 0) / hottestRoads.length
      : 0,
    hottestRoads: hottestRoads.slice(0, 10),
  };

  employers.forEach((building) => {
    delete building._remainingJobs;
  });
}
