import assert from 'node:assert/strict';
import test from 'node:test';

import {
  DISTRICT_COMPOSITIONS,
  DISTRICT_DEFINITIONS,
  WORLD_LAYOUT,
} from '../src/config/index.js';
import { buildDistrictPlacements, placementCellKeys } from '../src/render/district-placement.js';
import { cellKeysIsoPolygons, footprintAnchorPoint, isoProject, pointInPolygon, rectIsoPolygon } from '../src/render/terrain.js';
import { buildRectsFromCellKeys, cellKey, createWorldGeometry, rectFootprintCells } from '../src/render/world-geometry.js';

function plotCellKeys(plot) {
  return rectFootprintCells(plot).map((cell) => cell.key);
}

test('district plots exclude reserved roads and do not overlap', () => {
  const world = createWorldGeometry(WORLD_LAYOUT);
  const globalPlotCells = new Map();

  Object.entries(world.districts).forEach(([districtKey, geometry]) => {
    geometry.plots.forEach((plot) => {
      plotCellKeys(plot).forEach((plotKey) => {
        assert.equal(world.roadCellSet.has(plotKey), false, `${districtKey} plot leaked onto road cell ${plotKey}`);
        assert.equal(
          geometry.reservedCells.has(plotKey),
          false,
          `${districtKey} plot leaked onto reserved cell ${plotKey}`,
        );

        const previousOwner = globalPlotCells.get(plotKey);
        assert.equal(
          previousOwner,
          undefined,
          `plot cell ${plotKey} overlaps between ${previousOwner} and ${districtKey}`,
        );
        globalPlotCells.set(plotKey, districtKey);
      });
    });
  });
});

test('district territories stay clear of the main avenue corridors', () => {
  const world = createWorldGeometry(WORLD_LAYOUT);

  Object.entries(world.districts).forEach(([districtKey, geometry]) => {
    assert.equal(
      geometry.roadCellsInTerritory.length,
      0,
      `${districtKey} territory should not contain avenue or street cells`,
    );
  });

  assert.equal(world.districts.civic.plots.length, 1, 'civic should render as a contiguous block');
  assert.equal(world.districts.market.plots.length, 1, 'market should render as a contiguous block');
  assert.equal(world.districts.south.plots.length, 1, 'south should render as a contiguous block');
  assert.equal(
    world.districts.market.buildableCells.has(cellKey(24, 25)),
    false,
    'market buildable cells should stop before the avenue corridor',
  );
});

test('sprite placements stay inside buildable plots without collisions', () => {
  const world = createWorldGeometry(WORLD_LAYOUT);

  DISTRICT_DEFINITIONS.forEach((district) => {
    const geometry = world.districts[district.key];
    const placements = buildDistrictPlacements(district, geometry);
    const expectedPlacements = DISTRICT_COMPOSITIONS[district.type].length;
    const occupied = new Set();

    assert.equal(
      placements.length,
      expectedPlacements,
      `${district.key} should place all configured sprites without fallback overflow`,
    );

    placements.forEach((placement) => {
      placementCellKeys(placement).forEach((placementKey) => {
        assert.equal(
          geometry.buildableCells.has(placementKey),
          true,
          `${district.key} placement escaped buildable cells at ${placementKey}`,
        );
      });

      rectFootprintCells(placement.occupancy).forEach((cell) => {
        assert.equal(
          geometry.buildableCells.has(cell.key),
          true,
          `${district.key} occupancy leaked outside buildable cells at ${cell.key}`,
        );
        assert.equal(occupied.has(cell.key), false, `${district.key} occupancy collided at ${cell.key}`);
        occupied.add(cell.key);
      });
    });
  });
});

test('surface rects can be rebuilt from occupied district cells', () => {
  const world = createWorldGeometry(WORLD_LAYOUT);
  const civic = DISTRICT_DEFINITIONS.find((district) => district.key === 'civic');
  const civicGeometry = world.districts.civic;
  const placements = buildDistrictPlacements(civic, civicGeometry);
  const occupiedFootprintKeys = new Set(placements.flatMap((placement) => placementCellKeys(placement)));
  const surfaceRects = buildRectsFromCellKeys(occupiedFootprintKeys);
  const rebuiltKeys = new Set(surfaceRects.flatMap((rect) => plotCellKeys(rect)));

  assert.deepEqual(
    [...rebuiltKeys].sort(),
    [...occupiedFootprintKeys].sort(),
    'surface rects should match the exact footprint cells occupied by the district',
  );
  assert.ok(
    rebuiltKeys.size < civicGeometry.buildableCells.size,
    'surface rects should represent occupied cells, not the full district territory',
  );
});

test('rect iso polygons align to the same tile diamonds used by the terrain', () => {
  const metrics = {
    originX: 0,
    originY: 0,
    tileWidth: 64,
    tileHeight: 32,
  };

  assert.deepEqual(
    rectIsoPolygon({ x: 0, y: 0, w: 1, h: 1 }, metrics),
    [
      { x: 0, y: -16 },
      { x: 32, y: 0 },
      { x: 0, y: 16 },
      { x: -32, y: 0 },
    ],
    'a single-cell district polygon should match the terrain diamond exactly',
  );
});

test('sprite support points stay on the front vertex of each footprint', () => {
  const world = createWorldGeometry(WORLD_LAYOUT);
  const metrics = {
    originX: 0,
    originY: 0,
    tileWidth: 64,
    tileHeight: 32,
  };

  DISTRICT_DEFINITIONS.forEach((district) => {
    const geometry = world.districts[district.key];
    const placements = buildDistrictPlacements(district, geometry);

    placements.forEach((placement) => {
      assert.deepEqual(
        placement.supportPoint,
        {
          x: placement.footprint.x + placement.footprint.w - 0.5,
          y: placement.footprint.y + placement.footprint.h - 0.5,
        },
        `${district.key}:${placement.entry.spriteId} should expose the footprint front vertex as supportPoint`,
      );

      const anchorPoint = footprintAnchorPoint(placement.footprint, metrics);
      const polygon = rectIsoPolygon(placement.footprint, metrics);
      const lowestPoint = polygon.reduce((best, point) => (point.y > best.y ? point : best), polygon[0]);

      assert.deepEqual(
        anchorPoint,
        lowestPoint,
        `${district.key}:${placement.entry.spriteId} anchor should land on the lowest footprint vertex`,
      );
    });
  });
});

test('occupied district cell centers stay inside the rendered district silhouette', () => {
  const world = createWorldGeometry(WORLD_LAYOUT);
  const civic = DISTRICT_DEFINITIONS.find((district) => district.key === 'civic');
  const placements = buildDistrictPlacements(civic, world.districts.civic);
  const occupiedCellKeys = [...new Set(placements.flatMap((placement) => placementCellKeys(placement)))];
  const metrics = {
    originX: 0,
    originY: 0,
    tileWidth: 64,
    tileHeight: 32,
  };
  const polygons = cellKeysIsoPolygons(occupiedCellKeys, metrics);

  occupiedCellKeys.forEach((key) => {
    const [x, y] = key.split(',').map(Number);
    const point = isoProject(x, y, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);
    assert.equal(
      polygons.some((polygon) => pointInPolygon(point, polygon)),
      true,
      `occupied cell ${key} should remain inside the district silhouette`,
    );
  });

  const emptyPoint = isoProject(31, 18, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);
  assert.equal(
    polygons.some((polygon) => pointInPolygon(emptyPoint, polygon)),
    false,
    'a nearby empty cell should stay outside the district silhouette',
  );
});
