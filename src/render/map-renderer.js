import {
  ASSET_ICON_SPRITES,
  DISTRICT_COMPOSITIONS,
  OPEN_ASSET_FILES,
  SPRITE_CATALOG,
  WORLD_LAYOUT,
} from '../config/index.js';
import { createSpriteLibrary } from './sprite-library.js';
import {
  buildWorldRoadGraph,
  districtIsoFootprint,
  districtScreenFrame,
  hasAdjacentRoad,
  isoProject,
  isDistrictCell,
  isWaterCell,
  pointInPolygon,
  terrainMetrics,
} from './terrain.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
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
      const isoLayout = WORLD_LAYOUT.districts[district.key] ?? { x: 4, y: 4, w: 2, h: 2, frontage: 'south' };
      return {
        ...district,
        ...isoLayout,
        intensity: clamp(Math.round(2 + district.development * 5 + district.condition * 2), 2, 9),
        utilityTone: district.metrics.utilityLoad <= 0.95 ? 'good' : district.metrics.utilityLoad <= 1.1 ? 'warn' : 'danger',
        growthTone: district.growthTrend > 1 ? 'good' : district.growthTrend > -0.4 ? 'warn' : 'danger',
      };
    }).sort((left, right) => (left.y + left.h) - (right.y + right.h));

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
        const urbanBand = col > 8 && col < 22 && row > 6 && row < 19;
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

  function drawRoadCell(context, cell, metrics) {
    const point = isoProject(cell.x, cell.y, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);
    const roadWidth = metrics.tileWidth * (cell.type === 'avenue' ? 0.94 : 0.76);
    const roadHeight = metrics.tileHeight * (cell.type === 'avenue' ? 0.94 : 0.76);
    drawIsoDiamond(
      context,
      point.x,
      point.y,
      roadWidth,
      roadHeight,
      cell.type === 'avenue' ? 'rgba(22, 28, 34, 0.98)' : 'rgba(28, 34, 39, 0.94)',
      'rgba(255,255,255,0.06)',
      1,
    );

    context.strokeStyle = 'rgba(255, 220, 155, 0.34)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(point.x - roadWidth * 0.22, point.y);
    context.lineTo(point.x + roadWidth * 0.22, point.y);
    context.stroke();
  }

  function drawIsoRoads(context, metrics) {
    worldRoads.cells
      .sort((left, right) => (left.x + left.y) - (right.x + right.y))
      .forEach((cell) => drawRoadCell(context, cell, metrics));
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

  function drawDistrictGround(context, district, frame, hit, selection, hovered) {
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
      hit.points,
      `${fill}${Math.round(fillAlpha * 255).toString(16).padStart(2, '0')}`,
      `${accent}${Math.round(strokeAlpha * 255).toString(16).padStart(2, '0')}`,
      selection ? 3 : hovered ? 2 : 1.2,
    );

    context.strokeStyle = 'rgba(255,255,255,0.06)';
    context.lineWidth = 1;
    context.beginPath();
    context.moveTo(hit.points[0].x, hit.points[0].y);
    context.lineTo(hit.points[2].x, hit.points[2].y);
    context.moveTo(hit.points[1].x, hit.points[1].y);
    context.lineTo(hit.points[3].x, hit.points[3].y);
    context.stroke();

    if (district.type === 'park') {
      drawIsoDiamond(
        context,
        frame.center.x,
        frame.center.y,
        frame.w * 0.38,
        frame.h * 0.38,
        'rgba(122, 182, 110, 0.42)',
        'rgba(200,255,200,0.18)',
      );
    }
  }

  function districtLots(district, count) {
    if (district.type === 'park') {
      return [
        { x: district.x + 1.1, y: district.y + 0.9, width: 0.74, maxHeight: 2.4, depth: 0.08 },
        { x: district.x + district.w - 1.1, y: district.y + 1.0, width: 0.72, maxHeight: 2.3, depth: 0.1 },
        { x: district.x + district.w * 0.5, y: district.y + district.h - 0.9, width: 0.78, maxHeight: 2.2, depth: 0.2 },
      ].slice(0, count);
    }

    const frontage = WORLD_LAYOUT.districts[district.key]?.frontage ?? 'south';
    const templates = {
      south: [
        { x: 0.22, y: 0.2, width: 1.02, maxHeight: 5.2, depth: 0.08 },
        { x: 0.5, y: 0.12, width: 1.12, maxHeight: 5.8, depth: 0.06 },
        { x: 0.8, y: 0.26, width: 1.02, maxHeight: 5.1, depth: 0.1 },
        { x: 0.34, y: 0.7, width: 0.84, maxHeight: 4.1, depth: 0.2 },
        { x: 0.7, y: 0.78, width: 0.84, maxHeight: 3.9, depth: 0.22 },
      ],
      north: [
        { x: 0.2, y: 0.74, width: 1.02, maxHeight: 5.0, depth: 0.08 },
        { x: 0.5, y: 0.82, width: 1.08, maxHeight: 5.6, depth: 0.06 },
        { x: 0.8, y: 0.7, width: 1.0, maxHeight: 5.0, depth: 0.1 },
        { x: 0.32, y: 0.34, width: 0.82, maxHeight: 3.9, depth: 0.18 },
        { x: 0.68, y: 0.26, width: 0.82, maxHeight: 3.9, depth: 0.2 },
      ],
      west: [
        { x: 0.76, y: 0.18, width: 0.96, maxHeight: 5.2, depth: 0.08 },
        { x: 0.84, y: 0.5, width: 1.04, maxHeight: 5.6, depth: 0.06 },
        { x: 0.74, y: 0.82, width: 0.96, maxHeight: 5.0, depth: 0.1 },
        { x: 0.28, y: 0.34, width: 0.82, maxHeight: 4.0, depth: 0.18 },
        { x: 0.2, y: 0.7, width: 0.82, maxHeight: 3.9, depth: 0.2 },
      ],
      east: [
        { x: 0.24, y: 0.16, width: 0.96, maxHeight: 5.0, depth: 0.08 },
        { x: 0.14, y: 0.5, width: 1.02, maxHeight: 5.5, depth: 0.06 },
        { x: 0.24, y: 0.82, width: 0.96, maxHeight: 5.0, depth: 0.1 },
        { x: 0.72, y: 0.3, width: 0.82, maxHeight: 3.9, depth: 0.18 },
        { x: 0.8, y: 0.68, width: 0.82, maxHeight: 3.8, depth: 0.2 },
      ],
    };
    const chosen = templates[frontage] ?? templates.south;

    return chosen.slice(0, count).map((template) => ({
      x: district.x + 0.45 + Math.max(0, district.w - 0.9) * template.x,
      y: district.y + 0.45 + Math.max(0, district.h - 0.9) * template.y,
      width: template.width,
      maxHeight: template.maxHeight,
      depth: template.depth,
    }));
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

  function drawDistrictSprites(context, district, frame, metrics) {
    const spriteDefs = DISTRICT_COMPOSITIONS[district.type] ?? DISTRICT_COMPOSITIONS.mixed;

    if (!spriteLibrary.ready || spriteLibrary.failed) {
      drawDistrictFallback(context, district, frame);
      return;
    }

    const lots = districtLots(district, spriteDefs.length);
    const placements = spriteDefs
      .map((entry, index) => {
        const sprite = SPRITE_CATALOG[entry.spriteId];
        const lot = lots[index];
        if (!sprite || !lot) return null;

        const image = spriteLibrary.getImage(sprite.sheet);
        if (!image) return null;

        const source = spriteLibrary.getTrimmedAbsoluteRect(image, sprite.sourceRectPx);
        const aspectRatio = source.sh / Math.max(1, source.sw);
        const sizeFactor =
          sprite.sizeClass === 'tower' ? 1.34
          : sprite.sizeClass === 'hall' ? 1.18
          : sprite.sizeClass === 'small' ? 0.78
          : 0.98;
        const scaleBoost = (entry.scale ?? 1) * sprite.baseScale * sizeFactor * (0.92 + district.development * 0.14);
        let dw = metrics.tileWidth * lot.width * scaleBoost * sprite.visualWeight;
        let dh = dw * aspectRatio;
        const maxHeight = metrics.tileHeight * lot.maxHeight * (0.88 + district.condition * 0.16);
        if (dh > maxHeight) {
          dh = maxHeight;
          dw = dh / Math.max(0.1, aspectRatio);
        }
        const point = isoProject(lot.x, lot.y, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);

        return {
          image,
          sourceRectPx: sprite.sourceRectPx,
          x: point.x,
          baseY: point.y + metrics.tileHeight * 0.16,
          dw,
          dh,
          depth: lot.depth + lot.y,
        };
      })
      .filter(Boolean)
      .sort((left, right) => left.depth - right.depth);

    if (!placements.length) {
      drawDistrictFallback(context, district, frame);
      return;
    }

    placements.forEach((placement) => {
      context.fillStyle = 'rgba(5, 9, 12, 0.18)';
      context.beginPath();
      context.ellipse(
        placement.x,
        placement.baseY + metrics.tileHeight * 0.22,
        placement.dw * 0.34,
        metrics.tileHeight * 0.3,
        0,
        0,
        Math.PI * 2,
      );
      context.fill();
      spriteLibrary.drawSpriteCutout(
        context,
        placement.image,
        placement.sourceRectPx,
        placement.x - placement.dw * 0.5,
        placement.baseY - placement.dh,
        placement.dw,
        placement.dh,
        0.98,
      );
    });
  }

  function drawDistrict(context, district, width, metrics) {
    const frame = districtIsoFootprint(district, metrics);
    const hit = districtScreenFrame(district, metrics);
    const accent = districtAccent(district.type);
    const selection = selectionMatches('district', district.key);
    const hovered = hoverMatches('district', district.key);

    drawDistrictGround(context, district, {
      center: { x: frame.centerX, y: frame.centerY },
      w: frame.width,
      h: frame.height,
    }, hit, selection, hovered);
    drawDistrictSprites(context, district, {
      center: { x: frame.centerX, y: frame.centerY },
      w: frame.width,
      h: frame.height,
    }, metrics);

    context.fillStyle = 'rgba(7, 12, 16, 0.72)';
    fillRoundedRect(
      context,
      frame.centerX - frame.width * 0.16,
      frame.centerY + frame.height * 0.21,
      frame.width * 0.32,
      22,
      999,
      context.fillStyle,
    );
    context.fillStyle = accent;
    context.font = `700 ${Math.max(9, width * 0.009)}px "Trebuchet MS", sans-serif`;
    context.textAlign = 'center';
    context.fillText(district.label, frame.centerX, frame.centerY + frame.height * 0.37);
    context.font = `600 ${Math.max(8, width * 0.0075)}px "Trebuchet MS", sans-serif`;
    context.fillStyle = district.utilityTone === 'good' ? '#9ee2ad' : district.utilityTone === 'warn' ? '#ffd37f' : '#ff9f91';
    context.fillText(district.status, frame.centerX, frame.centerY + frame.height * 0.48);
    context.textAlign = 'left';

    interactiveTargets.push({
      kind: 'district',
      key: district.key,
      x: hit.x - 8,
      y: hit.y - 16,
      w: hit.w + 16,
      h: hit.h + frame.height * 1.8,
      points: hit.points,
      labelRect: {
        x: frame.centerX - frame.width * 0.16,
        y: frame.centerY + frame.height * 0.21,
        w: frame.width * 0.32,
        h: 22,
      },
    });
  }

  function assetAnchor(district, index = 0) {
    const lots = districtLots(district, 2);
    const lot = lots[index % Math.max(1, lots.length)] ?? {
      x: district.x + district.w * 0.5,
      y: district.y + district.h * 0.5,
    };
    return {
      x: lot.x + (index === 0 ? -0.15 : 0.18),
      y: lot.y + 0.38,
    };
  }

  function drawAssetMarker(context, asset, district, metrics, width, index) {
    const anchor = assetAnchor(district, index);
    const point = isoProject(anchor.x, anchor.y, metrics.originX, metrics.originY, metrics.tileWidth, metrics.tileHeight);
    const x = point.x;
    const y = point.y - metrics.tileHeight * 0.12;
    const radius = Math.max(14, width * 0.013);
    const selected = selectionMatches('asset', asset.key);
    const hovered = hoverMatches('asset', asset.key);
    const tone = engine.assetActionKey(asset);
    const districtGlow = districtAccent(district.type);
    const fill =
      tone === 'housing' ? 'rgba(152, 226, 166, 0.9)'
      : tone === 'grid' ? 'rgba(117, 214, 255, 0.88)'
      : tone === 'industry' ? 'rgba(255, 213, 138, 0.88)'
      : 'rgba(234, 241, 255, 0.88)';

    context.strokeStyle = `${districtGlow}55`;
    context.lineWidth = 2;
    context.beginPath();
    context.moveTo(x, y - radius * 1.25);
    context.lineTo(x, y - radius * 0.15);
    context.stroke();

    context.save();
    context.translate(x, y);
    context.rotate(Math.PI / 4);
    context.fillStyle = 'rgba(5, 10, 15, 0.92)';
    fillRoundedRect(context, -radius - 5, -radius - 5, (radius + 5) * 2, (radius + 5) * 2, 7, context.fillStyle);
    context.fillStyle = fill;
    fillRoundedRect(context, -radius, -radius, radius * 2, radius * 2, 6, context.fillStyle);
    context.restore();

    const icon = ASSET_ICON_SPRITES[asset.key];
    const iconImage = icon ? spriteLibrary.getImage(icon.sheet) : null;
    if (icon && iconImage) {
      spriteLibrary.drawSpriteRegion(
        context,
        iconImage,
        icon.region,
        x - radius * 0.72,
        y - radius * 0.92,
        radius * 1.44,
        radius * 1.25,
        0.98,
      );
    }

    if (selected || hovered) {
      context.strokeStyle = selected ? districtGlow : 'rgba(255, 255, 255, 0.72)';
      context.lineWidth = selected ? 3 : 2;
      context.beginPath();
      context.arc(x, y, radius + 6, 0, Math.PI * 2);
      context.stroke();
    }

    context.fillStyle = '#02131b';
    context.font = `700 ${Math.max(10, width * 0.01)}px "Trebuchet MS", sans-serif`;
    context.textAlign = 'center';
    context.fillText(`L${asset.level}`, x, y + radius * 1.02);
    context.textAlign = 'left';

    interactiveTargets.push({ kind: 'asset', key: asset.key, x: x - radius - 8, y: y - radius - 8, w: (radius + 8) * 2, h: (radius + 8) * 2 });
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
    const metrics = terrainMetrics(width, height, state.ui.camera, WORLD_LAYOUT);
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
    drawIsoRoads(context, metrics);
    districts.forEach((district) => drawDistrict(context, district, width, metrics));
    districts.forEach((district) => {
      const districtAssets = state.city.assets.filter((asset) => asset.districtKey === district.key);
      districtAssets.forEach((asset, index) => drawAssetMarker(context, asset, district, metrics, width, index));
    });
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
    const clamped = terrainMetrics(width, height, state.ui.camera, WORLD_LAYOUT).camera;
    if (clamped.x === state.ui.camera.x && clamped.y === state.ui.camera.y) return false;
    store.update((nextState) => {
      nextState.ui.camera = clamped;
    }, { reason: 'camera' });
    return true;
  }

  function setCameraPosition(nextCamera, width, height) {
    const state = getState();
    const clamped = terrainMetrics(width, height, nextCamera, WORLD_LAYOUT).camera;
    if (clamped.x === state.ui.camera.x && clamped.y === state.ui.camera.y) return false;
    store.update((nextState) => {
      nextState.ui.camera = clamped;
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
      if (target.points) {
        const onLabel = target.labelRect
          && point.x >= target.labelRect.x
          && point.x <= target.labelRect.x + target.labelRect.w
          && point.y >= target.labelRect.y
          && point.y <= target.labelRect.y + target.labelRect.h;
        return pointInPolygon(point, target.points) || onLabel;
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
    syncCameraToCanvas,
  };
}
