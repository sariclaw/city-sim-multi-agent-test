import { DISTRICT_COMPOSITIONS, SPRITE_CATALOG } from '../config/index.js';
import { cellKey, isoFrontDepth, rectFootprintCells } from './world-geometry.js';

function centeredRange(start, end) {
  const values = [];
  for (let value = start; value <= end; value += 1) {
    values.push(value);
  }

  const midpoint = (start + end) * 0.5;
  return values.sort((left, right) => {
    const leftDistance = Math.abs(left - midpoint);
    const rightDistance = Math.abs(right - midpoint);
    if (leftDistance === rightDistance) return left - right;
    return leftDistance - rightDistance;
  });
}

function plotSortValue(plot, frontage, territoryCenter) {
  switch (frontage) {
    case 'north':
      return plot.y - territoryCenter.y * 0.01;
    case 'south':
      return -(plot.y + plot.h);
    case 'east':
      return -(plot.x + plot.w);
    case 'west':
      return plot.x - territoryCenter.x * 0.01;
    default:
      return plot.y;
  }
}

function sortPlotsByFrontage(plots, frontage, territory) {
  const territoryCenter = {
    x: territory.x + territory.w * 0.5,
    y: territory.y + territory.h * 0.5,
  };

  return [...plots].sort((left, right) => {
    const leftValue = plotSortValue(left, frontage, territoryCenter);
    const rightValue = plotSortValue(right, frontage, territoryCenter);
    if (leftValue !== rightValue) return leftValue - rightValue;

    const leftCenter = left.x + left.w * 0.5;
    const rightCenter = right.x + right.w * 0.5;
    return Math.abs(leftCenter - territoryCenter.x) - Math.abs(rightCenter - territoryCenter.x);
  });
}

function candidateOriginsForPlot(plot, footprint, frontage) {
  const maxOriginX = plot.x + plot.w - footprint.w;
  const maxOriginY = plot.y + plot.h - footprint.h;
  if (maxOriginX < plot.x || maxOriginY < plot.y) return [];

  const xOrder =
    frontage === 'west' ? [...Array(maxOriginX - plot.x + 1)].map((_, index) => plot.x + index)
    : frontage === 'east' ? [...Array(maxOriginX - plot.x + 1)].map((_, index) => maxOriginX - index)
    : centeredRange(plot.x, maxOriginX);
  const yOrder =
    frontage === 'north' ? [...Array(maxOriginY - plot.y + 1)].map((_, index) => plot.y + index)
    : frontage === 'south' ? [...Array(maxOriginY - plot.y + 1)].map((_, index) => maxOriginY - index)
    : centeredRange(plot.y, maxOriginY);
  const searchColumnsFirst = frontage === 'west' || frontage === 'east';
  const candidates = [];

  if (searchColumnsFirst) {
    xOrder.forEach((originX) => {
      yOrder.forEach((originY) => {
        candidates.push({ x: originX, y: originY });
      });
    });
    return candidates;
  }

  yOrder.forEach((originY) => {
    xOrder.forEach((originX) => {
      candidates.push({ x: originX, y: originY });
    });
  });
  return candidates;
}

function occupancyRect(origin, sprite) {
  const clearance = sprite.clearance ?? {};
  return {
    x: origin.x - (clearance.left ?? 0),
    y: origin.y - (clearance.back ?? 0),
    w: sprite.footprintTiles.w + (clearance.left ?? 0) + (clearance.right ?? 0),
    h: sprite.footprintTiles.h + (clearance.back ?? 0) + (clearance.front ?? 0),
  };
}

function rectFitsBuildableArea(rect, buildableCells, occupiedCells) {
  const cells = rectFootprintCells(rect);
  return cells.every((cell) => buildableCells.has(cell.key) && !occupiedCells.has(cell.key));
}

function markOccupiedCells(rect, occupiedCells) {
  rectFootprintCells(rect).forEach((cell) => occupiedCells.add(cell.key));
}

function spriteSortOrder(entry) {
  const sprite = SPRITE_CATALOG[entry.spriteId];
  if (!sprite) return null;
  const area = sprite.footprintTiles.w * sprite.footprintTiles.h;
  return {
    entry,
    sprite,
    area,
  };
}

export function buildDistrictPlacements(district, districtGeometry, spriteDefs = DISTRICT_COMPOSITIONS[district.type] ?? DISTRICT_COMPOSITIONS.mixed) {
  const occupancy = new Set();
  const plots = sortPlotsByFrontage(districtGeometry.plots, districtGeometry.frontage, districtGeometry.territory);
  const plannedSprites = spriteDefs
    .map(spriteSortOrder)
    .filter(Boolean)
    .sort((left, right) => {
      if (left.sprite.placementPriority !== right.sprite.placementPriority) {
        return right.sprite.placementPriority - left.sprite.placementPriority;
      }
      if (left.area !== right.area) return right.area - left.area;
      return left.entry.spriteId.localeCompare(right.entry.spriteId);
    });

  return plannedSprites.reduce((placements, planned) => {
    const placement = plots.reduce((chosen, plot) => {
      if (chosen) return chosen;

      return candidateOriginsForPlot(plot, planned.sprite.footprintTiles, districtGeometry.frontage).find((origin) => {
        const reservedRect = occupancyRect(origin, planned.sprite);
        return rectFitsBuildableArea(reservedRect, districtGeometry.buildableCells, occupancy);
      }) ?? null;
    }, null);

    if (!placement) return placements;

    const reservedRect = occupancyRect(placement, planned.sprite);
    markOccupiedCells(reservedRect, occupancy);

    placements.push({
      districtKey: district.key,
      sprite: planned.sprite,
      entry: planned.entry,
      footprint: {
        x: placement.x,
        y: placement.y,
        w: planned.sprite.footprintTiles.w,
        h: planned.sprite.footprintTiles.h,
      },
      occupancy: reservedRect,
      supportPoint: {
        x: placement.x + planned.sprite.footprintTiles.w - 0.5,
        y: placement.y + planned.sprite.footprintTiles.h - 0.5,
      },
      depth: isoFrontDepth(
        placement.x,
        placement.y,
        planned.sprite.footprintTiles.w,
        planned.sprite.footprintTiles.h,
      ),
    });
    return placements;
  }, []);
}

export function placementCellKeys(placement) {
  return rectFootprintCells(placement.footprint).map((cell) => cellKey(cell.x, cell.y));
}
