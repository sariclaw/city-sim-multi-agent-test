import assert from 'node:assert/strict';
import test from 'node:test';

import { WORLD_LAYOUT } from '../src/config/index.js';
import { cellIsoPolygon, isoProject, terrainMetrics } from '../src/render/terrain.js';
import { pickTileFromPoint, roadVariantForKey } from '../src/render/world-geometry.js';
import { placementCells } from '../src/sim/selectors.js';
import { createInitialState } from '../src/sim/world-factory.js';

test('pickTileFromPoint resolves the same tile from its projected center', () => {
  const state = createInitialState();
  const metrics = terrainMetrics(1600, 900, { x: 0, y: 0 }, WORLD_LAYOUT, 1);
  const point = isoProject(16, 15, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight, state.world.tiles['16,15'].height);

  assert.deepEqual(
    pickTileFromPoint(point.x, point.y, state.world, metrics),
    { x: 16, y: 15, key: '16,15' },
  );
});

test('roadVariantForKey reports expected topology for the handcrafted starter network', () => {
  const state = createInitialState();

  assert.equal(roadVariantForKey(state.networks.roads.tiles, '16,15'), 'cross');
  assert.equal(roadVariantForKey(state.networks.roads.tiles, '11,19'), 'tee-s');
  assert.equal(roadVariantForKey(state.networks.roads.tiles, '5,16'), 'end-e');
  assert.equal(roadVariantForKey(state.networks.roads.tiles, '16,12'), 'straight-ns');
});

test('cellIsoPolygon returns the diamond corners in screen space', () => {
  const metrics = terrainMetrics(1200, 800, { x: 0, y: 0 }, WORLD_LAYOUT, 1);
  const polygon = cellIsoPolygon(0, 0, metrics, 0);

  assert.equal(polygon.length, 4);
  assert.equal(polygon[0].y < polygon[2].y, true);
  assert.equal(polygon[3].x < polygon[1].x, true);
});

test('road placement preview follows an orthogonal L-shaped path instead of a diagonal bresenham line', () => {
  const state = createInitialState();
  const keys = placementCells(state, 'road', { x: 8, y: 8 }, { x: 11, y: 10 });

  assert.deepEqual(
    keys,
    ['8,8', '9,8', '10,8', '11,8', '11,9', '11,10'],
  );
});
