import {
  OPEN_ASSET_FILES,
  WORLD_LAYOUT,
} from '../config/index.js';
import { buildDistrictPlacements, placementCellKeys } from './district-placement.js';
import { createSpriteLibrary } from './sprite-library.js';
import {
  buildWorldRoadGraph,
  clampZoom,
  districtScreenFrame,
  footprintAnchorPoint,
  hasAdjacentRoad,
  isoProject,
  isDistrictCell,
  cellKeysIsoPolygons,
  screenToIsoGrid,
  isWaterCell,
  pointInPolygon,
  terrainMetrics,
} from './terrain.js';
import { buildRectsFromCellKeys, createWorldGeometry } from './world-geometry.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function rectCellKeys(rect) {
  const cells = [];
  for (let y = rect.y; y < rect.y + rect.h; y += 1) {
    for (let x = rect.x; x < rect.x + rect.w; x += 1) {
      cells.push(`${x},${y}`);
    }
  }
  return cells;
}

function fillRoundedRect(context, x, y, width, height, radius, fillStyle) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
  context.fillStyle = fillStyle;
  context.fill();
}

function strokeRoundedRect(context, x, y, width, height, radius, strokeStyle, lineWidth = 1) {
  const r = Math.min(radius, width / 2, height / 2);
  context.beginPath();
  context.moveTo(x + r, y);
  context.arcTo(x + width, y, x + width, y + height, r);
  context.arcTo(x + width, y + height, x, y + height, r);
  context.arcTo(x, y + height, x, y, r);
  context.arcTo(x, y, x + width, y, r);
  context.closePath();
  context.lineWidth = lineWidth;
  context.strokeStyle = strokeStyle;
  context.stroke();
}

function drawIsoDiamond(context, centerX, centerY, width, height, fillStyle, strokeStyle = 'transparent', lineWidth = 1) {
  context.beginPath();
  context.moveTo(centerX, centerY - height * 0.5);
  context.lineTo(centerX + width * 0.5, centerY);
  context.lineTo(centerX, centerY + height * 0.5);
  context.lineTo(centerX - width * 0.5, centerY);
  context.closePath();
  context.fillStyle = fillStyle;
  context.fill();
  if (strokeStyle && strokeStyle !== 'transparent') {
    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
    context.stroke();
  }
}

function drawIsoPolygon(context, points, fillStyle, strokeStyle = 'transparent', lineWidth = 1) {
  if (!points?.length) return;
  context.beginPath();
  context.moveTo(points[0].x, points[0].y);
  for (let index = 1; index < points.length; index += 1) {
    context.lineTo(points[index].x, points[index].y);
  }
  context.closePath();
  if (fillStyle) {
    context.fillStyle = fillStyle;
    context.fill();
  }
  if (strokeStyle && strokeStyle !== 'transparent') {
    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
    context.stroke();
  }
}

function districtColor(type) {
  const colors = {
    civic: ['#7daab5', '#243746'],
    residential: ['#7396a2', '#213540'],
    utility: ['#658aa4', '#1c2d39'],
    commercial: ['#a88758', '#3b2a1c'],
    industrial: ['#997056', '#39251b'],
    park: ['#567e5d', '#1d3222'],
    mixed: ['#8b7896', '#2c2438'],
  };

  return colors[type] ?? colors.mixed;
}

function districtAccent(type) {
  const accents = {
    civic: '#cdeeff',
    residential: '#c9efff',
    utility: '#7be0ff',
    commercial: '#ffd089',
    industrial: '#ffb67d',
    park: '#a8e78e',
    mixed: '#e3c0ff',
  };

  return accents[type] ?? '#dbeeff';
}

function seasonPalette(season) {
  const palettes = {
    Spring: {
      skyTop: '#4f8fb5',
      skyBottom: '#d7f1ff',
      land: '#314f3b',
      glow: 'rgba(150, 227, 184, 0.28)',
      river: '#67b7df',
    },
    Summer: {
      skyTop: '#4b7fb1',
      skyBottom: '#eef6ff',
      land: '#3f5633',
      glow: 'rgba(255, 208, 126, 0.24)',
      river: '#5cb2dd',
    },
    Autumn: {
      skyTop: '#6f6e8e',
      skyBottom: '#f1d9b8',
      land: '#4a4132',
      glow: 'rgba(255, 165, 92, 0.26)',
      river: '#6294b7',
    },
    Winter: {
      skyTop: '#49617c',
      skyBottom: '#eef7ff',
      land: '#2d3945',
      glow: 'rgba(155, 213, 255, 0.2)',
      river: '#75a8c6',
    },
  };

  return palettes[season] ?? palettes.Spring;
}

export function createMapRenderer({ store, engine }) {
  const worldRoads = buildWorldRoadGraph(WORLD_LAYOUT);
  const worldGeometry = createWorldGeometry(WORLD_LAYOUT, worldRoads);
  const spriteLibrary = createSpriteLibrary(OPEN_ASSET_FILES, {
    onReady: () => paint(),
  });
  let interactiveTargets = [];

  function getState() {
    return store.getState();
  }

  function getCanvas() {
    return document.querySelector('[data-city-canvas]');
  }

  function selectionMatches(kind, key) {
    const state = getState();
    return state.ui.selection.kind === kind && state.ui.selection.key === key;
  }

  function hoverMatches(kind, key) {
    const hoveredTarget = getState().ui.hoveredTarget;
    return hoveredTarget?.kind === kind && hoveredTarget?.key === key;
  }

  function createCityViewModel() {
    const state = getState();
    const systems = state.city.systems;
    const districts = state.city.districts.map((district) => {
      const geometry = worldGeometry.districts[district.key];
      const territory = geometry?.territory ?? { x: 4, y: 4, w: 2, h: 2 };
      const placements = buildDistrictPlacements(district, geometry ?? {
        territory,
        plots: [territory],
        buildableCells: new Set(),
        frontage: 'south',
      });
      const surfaceCellKeys = placements.length
        ? [...new Set(placements.flatMap((placement) => placementCellKeys(placement)))]
        : geometry?.plots?.flatMap((plot) => rectCellKeys(plot)) ?? rectCellKeys(territory);
      const surfaceRects = buildRectsFromCellKeys(surfaceCellKeys);

      return {
        ...district,
        territory,
        plots: geometry?.plots ?? [territory],
        surfaceCellKeys,
        surfaceRects,
        frontage: geometry?.frontage ?? 'south',
        accessPoint: geometry?.accessPoint ?? { x: territory.x + territory.w * 0.5, y: territory.y + territory.h },
        labelCenter: geometry?.labelCenter ?? { x: territory.x + territory.w * 0.5, y: territory.y + territory.h * 0.5 },
        placements,
        intensity: clamp(Math.round(2 + district.development * 5 + district.condition * 2), 2, 9),
        utilityTone: district.metrics.utilityLoad <= 0.95 ? 'good' : district.metrics.utilityLoad <= 1.1 ? 'warn' : 'danger',
        growthTone: district.growthTrend > 1 ? 'good' : district.growthTrend > -0.4 ? 'warn' : 'danger',
      };
    }).sort((left, right) => (
      (left.territory.y + left.territory.h) - (right.territory.y + right.territory.h)
    ));

    return {
      palette: seasonPalette(engine.currentSeason()),
      districts,
      overlays: systems.overlays,
      demand: systems.demand,
      skyline: {
        towers: clamp(3 + Math.round(systems.economy.production / 34), 3, 8),
        cranes: clamp(1 + Math.round(Math.max(0, systems.pressure.growth)), 1, 5),
        smoke: clamp(Math.round(state.city.resources.unrest / 18 + systems.economy.production / 44), 0, 6),
      },
      stats: {
        season: engine.currentSeason(),
        population: Math.round(state.city.resources.population),
        treasury: Math.round(state.city.resources.treasury),
        unrest: Math.round(state.city.resources.unrest),
        satisfaction: Math.round(systems.mood.satisfaction),
        activityLevel: Math.round(systems.summary.activity),
      },
    };
  }

  function drawTerrainBase(context, width, height, palette, metrics) {
    const ridgeGradient = context.createLinearGradient(0, height * 0.2, 0, height);
    ridgeGradient.addColorStop(0, palette.land);
    ridgeGradient.addColorStop(1, '#182128');

    for (let row = 0; row < metrics.rows; row += 1) {
      for (let col = 0; col < metrics.cols; col += 1) {
        const point = isoProject(col, row, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);
        const water = isWaterCell(col, row, WORLD_LAYOUT);
        const urbanBand =
          col >= WORLD_LAYOUT.waterCols + 3
          && col <= WORLD_LAYOUT.cols - 6
          && row >= Math.floor(WORLD_LAYOUT.rows * 0.18)
          && row <= WORLD_LAYOUT.rows - 6;
        const roadAdjacency = hasAdjacentRoad(col, row, worldRoads);
        const fill = water
          ? `rgba(72, ${134 + row * 2}, ${170 + col * 2}, 0.94)`
          : urbanBand
            ? `rgba(${74 + row * 3}, ${96 + col * 2}, ${76 + row}, 0.94)`
            : `rgba(${48 + row * 3}, ${84 + col * 2}, ${60 + row}, 0.96)`;
        drawIsoDiamond(
          context,
          point.x,
          point.y,
          metrics.tileWidth + 1,
          metrics.tileHeight + 1,
          fill,
          water ? 'rgba(210,245,255,0.08)' : 'rgba(255,255,255,0.05)',
        );
        if (!water && !isDistrictCell(col, row, WORLD_LAYOUT) && (roadAdjacency || (row + col) % 4 === 0)) {
          context.strokeStyle = 'rgba(255,255,255,0.035)';
          context.lineWidth = 1;
          context.beginPath();
          context.moveTo(point.x - metrics.tileWidth * 0.18, point.y);
          context.lineTo(point.x + metrics.tileWidth * 0.18, point.y);
          context.stroke();
        }
      }
    }

    context.fillStyle = ridgeGradient;
    context.beginPath();
    const a = isoProject(0, 0, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);
    const b = isoProject(metrics.cols - 1, 0, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);
    const c = isoProject(metrics.cols - 1, metrics.rows - 1, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);
    const d = isoProject(0, metrics.rows - 1, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);
    context.moveTo(a.x, a.y - metrics.tileHeight * 0.55);
    context.lineTo(b.x + metrics.tileWidth * 0.5, b.y);
    context.lineTo(c.x, c.y + metrics.tileHeight * 1.35);
    context.lineTo(d.x - metrics.tileWidth * 0.5, d.y);
    context.closePath();
    context.globalAlpha = 0.12;
    context.fill();
    context.globalAlpha = 1;
  }

  function offsetPoint(point, vector, scale) {
    return {
      x: point.x + vector.x * scale,
      y: point.y + vector.y * scale,
    };
  }

  function roadConnections(cell) {
    return {
      east: worldRoads.cellMap.has(`${cell.x + 1},${cell.y}`),
      west: worldRoads.cellMap.has(`${cell.x - 1},${cell.y}`),
      north: worldRoads.cellMap.has(`${cell.x},${cell.y - 1}`),
      south: worldRoads.cellMap.has(`${cell.x},${cell.y + 1}`),
    };
  }

  function drawRoadStrip(
    context,
    center,
    axisVector,
    crossVector,
    axisHalf,
    crossCenter,
    crossHalf,
    fillStyle,
    strokeStyle = 'transparent',
    lineWidth = 1,
  ) {
    const shiftedCenter = offsetPoint(center, crossVector, crossCenter);
    const points = [
      offsetPoint(offsetPoint(shiftedCenter, axisVector, -axisHalf), crossVector, -crossHalf),
      offsetPoint(offsetPoint(shiftedCenter, axisVector, axisHalf), crossVector, -crossHalf),
      offsetPoint(offsetPoint(shiftedCenter, axisVector, axisHalf), crossVector, crossHalf),
      offsetPoint(offsetPoint(shiftedCenter, axisVector, -axisHalf), crossVector, crossHalf),
    ];
    drawIsoPolygon(context, points, fillStyle, strokeStyle, lineWidth);
  }

  function drawRoadMark(context, center, axisVector, crossVector, axisHalf, crossCenter, strokeStyle) {
    const start = offsetPoint(offsetPoint(center, crossVector, crossCenter), axisVector, -axisHalf + 0.15);
    const end = offsetPoint(offsetPoint(center, crossVector, crossCenter), axisVector, axisHalf - 0.15);
    context.strokeStyle = strokeStyle;
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(start.x, start.y);
    context.lineTo(end.x, end.y);
    context.stroke();
  }

  function drawRoadCell(context, cell, metrics) {
    const point = isoProject(cell.x, cell.y, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);
    const rowAxis = { x: metrics.tileWidth * 0.5, y: metrics.tileHeight * 0.5 };
    const colAxis = { x: -metrics.tileWidth * 0.5, y: metrics.tileHeight * 0.5 };
    const connections = roadConnections(cell);
    const rowFlow = connections.east || connections.west;
    const colFlow = connections.north || connections.south;
    const avenue = cell.type === 'avenue';

    if (rowFlow && colFlow) {
      drawIsoDiamond(
        context,
        point.x,
        point.y,
        metrics.tileWidth * (avenue ? 0.9 : 0.68),
        metrics.tileHeight * (avenue ? 0.9 : 0.68),
        avenue ? 'rgba(18, 24, 30, 0.9)' : 'rgba(24, 30, 36, 0.88)',
        'rgba(255,255,255,0.05)',
        1,
      );
      if (avenue) {
        drawIsoDiamond(
          context,
          point.x,
          point.y,
          metrics.tileWidth * 0.28,
          metrics.tileHeight * 0.28,
          'rgba(50, 58, 66, 0.72)',
        );
      }
      return;
    }

    const axisVector = rowFlow ? rowAxis : colAxis;
    const crossVector = rowFlow ? colAxis : rowAxis;

    if (avenue) {
      drawIsoDiamond(
        context,
        point.x,
        point.y,
        metrics.tileWidth * 0.9,
        metrics.tileHeight * 0.9,
        'rgba(18, 24, 30, 0.9)',
        'rgba(255,255,255,0.05)',
        1,
      );
      drawRoadMark(context, point, axisVector, crossVector, 0.48, -0.14, 'rgba(255, 214, 150, 0.16)');
      drawRoadMark(context, point, axisVector, crossVector, 0.48, 0.14, 'rgba(255, 214, 150, 0.16)');
      drawRoadMark(context, point, axisVector, crossVector, 0.48, 0, 'rgba(65, 74, 82, 0.5)');
      return;
    }

    drawIsoDiamond(
      context,
      point.x,
      point.y,
      metrics.tileWidth * 0.58,
      metrics.tileHeight * 0.58,
      'rgba(28, 33, 38, 0.92)',
      'rgba(255,255,255,0.04)',
      1,
    );
    drawRoadMark(context, point, axisVector, crossVector, 0.44, 0, 'rgba(255, 214, 150, 0.2)');
  }

  function drawWaterfront(context, palette, metrics) {
    for (let row = 0; row < WORLD_LAYOUT.rows; row += 1) {
      const shoreCol = WORLD_LAYOUT.waterCols + (row < 5 ? 1 : 0);
      const landPoint = isoProject(shoreCol, row, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);
      context.strokeStyle = `${palette.glow}66`;
      context.lineWidth = 2;
      context.beginPath();
      context.moveTo(landPoint.x - metrics.tileWidth * 0.5, landPoint.y);
      context.lineTo(landPoint.x, landPoint.y - metrics.tileHeight * 0.5);
      context.stroke();

      context.strokeStyle = 'rgba(210, 245, 255, 0.18)';
      context.lineWidth = 1;
      context.beginPath();
      context.moveTo(landPoint.x - metrics.tileWidth * 0.36, landPoint.y + metrics.tileHeight * 0.06);
      context.lineTo(landPoint.x - metrics.tileWidth * 0.08, landPoint.y - metrics.tileHeight * 0.18);
      context.stroke();
    }
  }

  function drawDistrictGround(context, district, polygon, selection, hovered) {
    const [fill] = districtColor(district.type);
    const accent = districtAccent(district.type);
    const fillAlpha =
      selection ? 0.28
      : hovered ? 0.18
      : 0.09;
    const strokeAlpha =
      selection ? 0.85
      : hovered ? 0.58
      : 0.2;
    drawIsoPolygon(
      context,
      polygon,
      `${fill}${Math.round(fillAlpha * 255).toString(16).padStart(2, '0')}`,
      `${accent}${Math.round(strokeAlpha * 255).toString(16).padStart(2, '0')}`,
      selection ? 3 : hovered ? 2 : 1.2,
    );
  }

  function drawPlacementPad(context, polygon) {
    drawIsoPolygon(
      context,
      polygon,
      'rgba(5, 9, 12, 0.05)',
      'rgba(255,255,255,0.03)',
      0.8,
    );
  }

  function drawDistrictFallback(context, district, frame) {
    const columns = district.type === 'park' ? 3 : 4;
    const rows = district.type === 'park' ? 2 : 3;
    for (let row = 0; row < rows; row += 1) {
      for (let col = 0; col < columns; col += 1) {
        const px = frame.center.x + (col - (columns - 1) * 0.5) * frame.w * 0.16 + row * frame.w * 0.035;
        const py = frame.center.y + (row - 1.5) * frame.h * 0.1 + col * frame.h * 0.025;
        const bw = frame.w * 0.11;
        const bh = district.type === 'park' ? frame.h * 0.12 : frame.h * (0.18 + ((col + row) % 2) * 0.05);
        context.fillStyle = district.type === 'park' ? 'rgba(98,160,92,0.62)' : 'rgba(34,42,48,0.72)';
        fillRoundedRect(context, px - bw * 0.5, py - bh, bw, bh, 4, context.fillStyle);
        if (district.type !== 'park') {
          context.fillStyle = 'rgba(255, 222, 153, 0.12)';
          fillRoundedRect(context, px - bw * 0.28, py - bh * 0.72, bw * 0.56, bh * 0.1, 3, context.fillStyle);
        }
      }
    }
  }

  function footprintPolygons(placement, metrics) {
    return cellKeysIsoPolygons(placementCellKeys(placement), metrics);
  }

  function districtFrame(district, metrics) {
    const hit = districtScreenFrame(district, metrics);
    const labelPoint = {
      x: hit.center.x,
      y: hit.y + hit.h + metrics.tileHeight * 0.6,
    };
    return {
      ...hit,
      labelPoint,
      center: hit.center,
    };
  }

  function drawDistrictLabel(context, district, width, metrics) {
    const frame = districtFrame(district, metrics);
    const accent = districtAccent(district.type);
    const labelWidth = Math.max(frame.w * 0.3, 92);
    const labelHeight = 36;
    const labelY = frame.labelPoint.y - labelHeight * 0.5;

    context.fillStyle = 'rgba(7, 12, 16, 0.72)';
    fillRoundedRect(
      context,
      frame.labelPoint.x - labelWidth * 0.5,
      labelY,
      labelWidth,
      labelHeight,
      999,
      context.fillStyle,
    );

    context.fillStyle = accent;
    context.font = `700 ${Math.max(9, width * 0.009)}px "Trebuchet MS", sans-serif`;
    context.textAlign = 'center';
    context.fillText(district.label, frame.labelPoint.x, labelY + 14);
    context.font = `600 ${Math.max(8, width * 0.0075)}px "Trebuchet MS", sans-serif`;
    context.fillStyle = district.utilityTone === 'good' ? '#9ee2ad' : district.utilityTone === 'warn' ? '#ffd37f' : '#ff9f91';
    context.fillText(district.status, frame.labelPoint.x, labelY + 28);
    context.textAlign = 'left';

    interactiveTargets.push({
      kind: 'district',
      key: district.key,
      x: frame.x - 8,
      y: frame.y - 16,
      w: frame.w + 16,
      h: frame.h + labelHeight + metrics.tileHeight,
      polygons: frame.polygons,
      labelRect: {
        x: frame.labelPoint.x - labelWidth * 0.5,
        y: labelY,
        w: labelWidth,
        h: labelHeight,
      },
    });
  }

  function buildRoadSceneNodes(metrics) {
    return worldRoads.cells.map((cell) => {
      const point = isoProject(cell.x, cell.y, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);
      return {
        layer: 1,
        sortY: point.y,
        draw(context) {
          drawRoadCell(context, cell, metrics);
        },
      };
    });
  }

  function buildDistrictSceneNodes(viewModel, metrics) {
    return viewModel.districts.flatMap((district) => {
      const selection = selectionMatches('district', district.key);
      const hovered = hoverMatches('district', district.key);
      const frame = districtFrame(district, metrics);
      return frame.polygons.map((polygon) => {
        const sortY = Math.max(...polygon.map((point) => point.y));
        return {
          layer: 0,
          sortY,
          draw(context) {
            drawDistrictGround(context, district, polygon, selection, hovered);
          },
        };
      });
    });
  }

  function buildSpriteSceneNodes(viewModel, metrics) {
    if (!spriteLibrary.ready || spriteLibrary.failed) {
      return viewModel.districts.map((district) => {
        const frame = districtFrame(district, metrics);
        return {
          layer: 2,
          sortY: frame.center.y,
          draw(context) {
            drawDistrictFallback(context, district, {
              center: frame.center,
              w: frame.w,
              h: frame.h,
            });
          },
        };
      });
    }

    return viewModel.districts.flatMap((district) => district.placements.flatMap((placement) => {
      const image = spriteLibrary.getImage(placement.sprite.sheet);
      if (!image) return [];

      const source = spriteLibrary.getTrimmedAbsoluteRect(image, placement.sprite.sourceRectPx);
      const aspectRatio = source.sh / Math.max(1, source.sw);
      const footprintSpan = ((placement.footprint.w + placement.footprint.h) * 0.5) || 1;
      const support = footprintAnchorPoint(placement.footprint, metrics);
      const scaleBoost = (placement.entry.scale ?? 1) * placement.sprite.drawScale * (0.94 + district.development * 0.08);
      const dw = metrics.tileWidth * footprintSpan * scaleBoost;
      const dh = dw * aspectRatio;
      const padPolygons = footprintPolygons(placement, metrics);
      const baseY = support.y;

      return [
        {
          layer: 2,
          sortY: baseY,
          draw(context) {
            padPolygons.forEach((polygon) => drawPlacementPad(context, polygon));
          },
        },
        {
          layer: 3,
          sortY: baseY,
          draw(context) {
            spriteLibrary.drawSpriteCutout(
              context,
              image,
              placement.sprite.sourceRectPx,
              support.x - dw * placement.sprite.anchor.x,
              baseY - dh * placement.sprite.anchor.y,
              dw,
              dh,
              0.98,
            );
          },
        },
      ];
    }));
  }

  function drawSceneNodes(context, nodes) {
    nodes
      .sort((left, right) => {
        if (left.sortY !== right.sortY) return left.sortY - right.sortY;
        return left.layer - right.layer;
      })
      .forEach((node) => node.draw(context));
  }

  function drawBackdropCity(context, width, height, palette) {
    const horizon = height * 0.34;
    context.fillStyle = 'rgba(5, 10, 18, 0.34)';
    for (let index = 0; index < 9; index += 1) {
      const towerX = width * 0.12 + index * width * 0.085;
      const towerWidth = width * (0.04 + (index % 3) * 0.01);
      const towerHeight = height * (0.12 + (index % 4) * 0.03);
      fillRoundedRect(context, towerX, horizon - towerHeight, towerWidth, towerHeight, 6, context.fillStyle);
    }
    context.fillStyle = `${palette.glow}44`;
    context.fillRect(0, horizon - 6, width, 12);
  }

  function drawForegroundCanopy(context, width, height) {
    context.fillStyle = 'rgba(4, 10, 15, 0.22)';
    context.beginPath();
    context.moveTo(0, height);
    context.quadraticCurveTo(width * 0.2, height * 0.92, width * 0.38, height);
    context.lineTo(0, height);
    context.closePath();
    context.fill();
    context.beginPath();
    context.moveTo(width, height);
    context.quadraticCurveTo(width * 0.8, height * 0.9, width * 0.62, height);
    context.lineTo(width, height);
    context.closePath();
    context.fill();
  }

  function drawMap(context, viewModel, width, height) {
    interactiveTargets = [];
    const { palette, districts } = viewModel;
    const state = getState();
    const metrics = terrainMetrics(width, height, state.ui.camera, WORLD_LAYOUT, state.ui.zoom);
    const sky = context.createLinearGradient(0, 0, 0, height);
    sky.addColorStop(0, palette.skyTop);
    sky.addColorStop(0.42, palette.skyBottom);
    sky.addColorStop(0.421, '#233320');
    sky.addColorStop(1, '#16202a');
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    context.fillStyle = palette.glow;
    context.beginPath();
    context.arc(width * 0.77, height * 0.16, width * 0.12, 0, Math.PI * 2);
    context.fill();

    drawBackdropCity(context, width, height, palette);
    drawTerrainBase(context, width, height, palette, metrics);
    drawWaterfront(context, palette, metrics);
    drawSceneNodes(context, [
      ...buildDistrictSceneNodes(viewModel, metrics),
      ...buildRoadSceneNodes(metrics),
      ...buildSpriteSceneNodes(viewModel, metrics),
    ]);
    districts.forEach((district) => drawDistrictLabel(context, district, width, metrics));
    drawForegroundCanopy(context, width, height);
  }

  function paint() {
    spriteLibrary.ensureReady();
    const canvas = getCanvas();
    if (!canvas) return;

    const context = canvas.getContext('2d');
    const frame = canvas.parentElement;
    if (!context || !frame) return;

    const width = frame.clientWidth;
    const height = frame.clientHeight;
    const dpr = window.devicePixelRatio || 1;

    canvas.width = Math.floor(width * dpr);
    canvas.height = Math.floor(height * dpr);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.scale(dpr, dpr);

    drawMap(context, createCityViewModel(), width, height);
  }

  function resize() {
    paint();
  }

  function syncCameraToCanvas() {
    const canvas = getCanvas();
    if (!canvas) return false;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const state = getState();
    const zoom = clampZoom(state.ui.zoom);
    const clamped = terrainMetrics(width, height, state.ui.camera, WORLD_LAYOUT, zoom).camera;
    if (clamped.x === state.ui.camera.x && clamped.y === state.ui.camera.y && zoom === state.ui.zoom) return false;
    store.update((nextState) => {
      nextState.ui.camera = clamped;
      nextState.ui.zoom = zoom;
    }, { reason: 'camera' });
    return true;
  }

  function setCameraPosition(nextCamera, width, height) {
    const state = getState();
    const zoom = clampZoom(state.ui.zoom);
    const clamped = terrainMetrics(width, height, nextCamera, WORLD_LAYOUT, zoom).camera;
    if (clamped.x === state.ui.camera.x && clamped.y === state.ui.camera.y && zoom === state.ui.zoom) return false;
    store.update((nextState) => {
      nextState.ui.camera = clamped;
      nextState.ui.zoom = zoom;
    }, { reason: 'camera' });
    return true;
  }

  function setZoomLevel(nextZoom, anchorPoint, width, height) {
    if (!width || !height) return false;

    const state = getState();
    const zoom = clampZoom(nextZoom);
    const currentZoom = clampZoom(state.ui.zoom);
    const focusPoint = anchorPoint ?? { x: width * 0.5, y: height * 0.5 };
    const currentMetrics = terrainMetrics(width, height, state.ui.camera, WORLD_LAYOUT, currentZoom);
    const worldPoint = screenToIsoGrid(focusPoint.x, focusPoint.y, currentMetrics);
    const nextMetrics = terrainMetrics(width, height, currentMetrics.camera, WORLD_LAYOUT, zoom);
    const baseProjectedPoint = isoProject(
      worldPoint.x,
      worldPoint.y,
      nextMetrics.baseOriginX,
      nextMetrics.baseOriginY,
      nextMetrics.tileWidth,
      nextMetrics.tileHeight,
    );
    const desiredCamera = {
      x: focusPoint.x - baseProjectedPoint.x,
      y: focusPoint.y - baseProjectedPoint.y,
    };
    const clampedCamera = terrainMetrics(width, height, desiredCamera, WORLD_LAYOUT, zoom).camera;

    if (
      zoom === state.ui.zoom
      && clampedCamera.x === state.ui.camera.x
      && clampedCamera.y === state.ui.camera.y
    ) {
      return false;
    }

    store.update((nextState) => {
      nextState.ui.zoom = zoom;
      nextState.ui.camera = clampedCamera;
    }, { reason: 'camera' });
    return true;
  }

  function canvasPoint(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  function hitTest(point) {
    return [...interactiveTargets].reverse().find((target) => {
      const withinRect =
        point.x >= target.x
        && point.x <= target.x + target.w
        && point.y >= target.y
        && point.y <= target.y + target.h;
      if (!withinRect) return false;
      if (target.polygons?.length) {
        const onLabel = target.labelRect
          && point.x >= target.labelRect.x
          && point.x <= target.labelRect.x + target.labelRect.w
          && point.y >= target.labelRect.y
          && point.y <= target.labelRect.y + target.labelRect.h;
        return target.polygons.some((polygon) => pointInPolygon(point, polygon)) || onLabel;
      }
      return true;
    }) ?? null;
  }

  return {
    canvasPoint,
    getCanvas,
    hitTest,
    paint,
    resize,
    setCameraPosition,
    setZoomLevel,
    syncCameraToCanvas,
  };
}
