import {
  BUILDING_DEFINITIONS,
  BUILDING_SPRITES,
  DEFAULT_OVERLAY,
  OPEN_ASSET_FILES,
  TOOL_DEFINITIONS,
  WORLD_LAYOUT,
  ZONE_DEFINITIONS,
} from '../config/index.js';
import { buildingAt, overlayValueForTile, roadAt, zoneAt } from '../sim/selectors.js';
import { createSpriteLibrary } from './sprite-library.js';
import { cellIsoPolygon, clampZoom, isoProject, terrainMetrics } from './terrain.js';
import { pickTileFromPoint, roadVariantForKey } from './world-geometry.js';

function drawPolygon(context, polygon, fillStyle, strokeStyle = null, lineWidth = 1) {
  context.beginPath();
  context.moveTo(polygon[0].x, polygon[0].y);
  for (let index = 1; index < polygon.length; index += 1) {
    context.lineTo(polygon[index].x, polygon[index].y);
  }
  context.closePath();
  if (fillStyle) {
    context.fillStyle = fillStyle;
    context.fill();
  }
  if (strokeStyle) {
    context.strokeStyle = strokeStyle;
    context.lineWidth = lineWidth;
    context.stroke();
  }
}

function hexToRgba(hex, alpha) {
  const normalized = hex.replace('#', '');
  const numeric = Number.parseInt(normalized, 16);
  const r = (numeric >> 16) & 255;
  const g = (numeric >> 8) & 255;
  const b = numeric & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function polygonCenter(polygon) {
  return polygon.reduce((sum, point) => ({
    x: sum.x + point.x / polygon.length,
    y: sum.y + point.y / polygon.length,
  }), { x: 0, y: 0 });
}

function scalePolygon(polygon, amount) {
  const center = polygonCenter(polygon);
  return polygon.map((point) => ({
    x: center.x + (point.x - center.x) * amount,
    y: center.y + (point.y - center.y) * amount,
  }));
}

function lerpPoint(a, b, amount) {
  return {
    x: a.x + (b.x - a.x) * amount,
    y: a.y + (b.y - a.y) * amount,
  };
}

function terrainColor(tile) {
  if (tile.type === 'water') return ['#5ba5cc', '#8fd4ee'];
  if (tile.type === 'rock') return ['#5d6873', '#8a96a1'];
  if (tile.type === 'hill') return ['#607458', '#8ea979'];
  return ['#4f7049', '#759667'];
}

function overlayColor(overlay, value) {
  const amount = Math.max(0, Math.min(1, value));
  if (!amount || overlay === DEFAULT_OVERLAY) return null;

  const palette = {
    traffic: '#ff9474',
    heat: '#ffd47e',
    power: '#7bd7ff',
    water: '#6be6d1',
    'land-value': '#c3ff97',
    pollution: '#bf6d63',
    services: '#b7ffd4',
  };

  return hexToRgba(palette[overlay] ?? '#ffffff', 0.14 + amount * 0.46);
}

function drawRoadMark(context, polygon, start, end, color, width) {
  context.save();
  context.strokeStyle = color;
  context.lineCap = 'round';
  context.lineWidth = width;
  context.beginPath();
  context.moveTo(start.x, start.y);
  context.lineTo(end.x, end.y);
  context.stroke();
  context.restore();
}

function drawRoadTile(context, polygon, road, variant, trafficRatio) {
  const shell = scalePolygon(polygon, road.kind === 'avenue' ? 0.96 : 0.9);
  const core = scalePolygon(polygon, road.kind === 'avenue' ? 0.84 : 0.74);
  const center = polygonCenter(shell);
  const markColor = road.kind === 'avenue' ? 'rgba(255, 222, 140, 0.8)' : 'rgba(237, 239, 244, 0.72)';
  const trafficColor = trafficRatio > 0 ? hexToRgba('#ff936a', 0.3 + Math.min(trafficRatio, 1) * 0.5) : null;
  const width = road.kind === 'avenue' ? 2.4 : 1.8;

  drawPolygon(context, shell, road.kind === 'avenue' ? '#3f464f' : '#48505a', 'rgba(16, 20, 24, 0.82)', 1.2);
  drawPolygon(context, core, road.kind === 'avenue' ? '#616976' : '#5b6370');
  if (trafficColor) drawPolygon(context, core, trafficColor);

  const top = lerpPoint(center, shell[0], 0.82);
  const right = lerpPoint(center, shell[1], 0.82);
  const bottom = lerpPoint(center, shell[2], 0.82);
  const left = lerpPoint(center, shell[3], 0.82);

  switch (variant) {
    case 'straight-ew':
      drawRoadMark(context, polygon, left, right, markColor, width);
      break;
    case 'straight-ns':
      drawRoadMark(context, polygon, top, bottom, markColor, width);
      break;
    case 'curve-ne':
      drawRoadMark(context, polygon, top, center, markColor, width);
      drawRoadMark(context, polygon, center, right, markColor, width);
      break;
    case 'curve-es':
      drawRoadMark(context, polygon, right, center, markColor, width);
      drawRoadMark(context, polygon, center, bottom, markColor, width);
      break;
    case 'curve-sw':
      drawRoadMark(context, polygon, bottom, center, markColor, width);
      drawRoadMark(context, polygon, center, left, markColor, width);
      break;
    case 'curve-wn':
      drawRoadMark(context, polygon, left, center, markColor, width);
      drawRoadMark(context, polygon, center, top, markColor, width);
      break;
    case 'tee-n':
      drawRoadMark(context, polygon, left, right, markColor, width);
      drawRoadMark(context, polygon, center, bottom, markColor, width);
      break;
    case 'tee-e':
      drawRoadMark(context, polygon, top, bottom, markColor, width);
      drawRoadMark(context, polygon, center, left, markColor, width);
      break;
    case 'tee-s':
      drawRoadMark(context, polygon, left, right, markColor, width);
      drawRoadMark(context, polygon, center, top, markColor, width);
      break;
    case 'tee-w':
      drawRoadMark(context, polygon, top, bottom, markColor, width);
      drawRoadMark(context, polygon, center, right, markColor, width);
      break;
    case 'cross':
      drawRoadMark(context, polygon, top, bottom, markColor, width);
      drawRoadMark(context, polygon, left, right, markColor, width);
      break;
    case 'end-n':
      drawRoadMark(context, polygon, center, top, markColor, width);
      break;
    case 'end-e':
      drawRoadMark(context, polygon, center, right, markColor, width);
      break;
    case 'end-s':
      drawRoadMark(context, polygon, center, bottom, markColor, width);
      break;
    case 'end-w':
      drawRoadMark(context, polygon, center, left, markColor, width);
      break;
    default:
      drawRoadMark(context, polygon, lerpPoint(center, shell[3], 0.35), lerpPoint(center, shell[1], 0.35), markColor, width);
      break;
  }
}

function chooseBuildingSprite(building) {
  const candidates = BUILDING_SPRITES[building.type] ?? BUILDING_SPRITES[building.zoneType] ?? [];
  if (!candidates.length) return null;
  const occupancy = building.occupancy ?? 0;
  const eligible = candidates.filter((sprite) => occupancy >= (sprite.minOccupancy ?? 0));
  const pool = eligible.length ? eligible : candidates;
  const index = Math.abs((building.x * 7 + building.y * 13) % pool.length);
  return pool[index];
}

function drawFallbackBuilding(context, polygon, tileHeight, fill) {
  const height = tileHeight * 1.15;
  const top = polygon.map((point) => ({ x: point.x, y: point.y - height }));
  drawPolygon(context, [polygon[3], polygon[2], top[2], top[3]], hexToRgba(fill, 0.5));
  drawPolygon(context, [polygon[1], polygon[2], top[2], top[1]], hexToRgba(fill, 0.7));
  drawPolygon(context, top, fill, 'rgba(16, 20, 24, 0.85)', 1.2);
}

function selectionKey(state) {
  if (state.ui.selection?.kind === 'tile') return state.ui.selection.key;
  if (state.ui.selection?.kind === 'building') {
    const building = state.world.buildings[state.ui.selection.key];
    return building ? `${building.x},${building.y}` : null;
  }
  return null;
}

export function createMapRenderer({ store, engine }) {
  const spriteLibrary = createSpriteLibrary(OPEN_ASSET_FILES, { onReady: () => paint() });
  let lastMetrics = null;

  function getCanvas() {
    return document.querySelector('[data-city-canvas]');
  }

  function resize() {
    const canvas = getCanvas();
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const pixelRatio = window.devicePixelRatio || 1;
    const width = Math.max(1, Math.round(rect.width * pixelRatio));
    const height = Math.max(1, Math.round(rect.height * pixelRatio));

    if (canvas.width !== width || canvas.height !== height) {
      canvas.width = width;
      canvas.height = height;
    }

    return canvas;
  }

  function currentMetrics(canvas = getCanvas()) {
    if (!canvas) return null;
    const state = store.getState();
    const metrics = terrainMetrics(
      canvas.width,
      canvas.height,
      state.ui.camera,
      {
        cols: state.world.cols,
        rows: state.world.rows,
        safeArea: WORLD_LAYOUT.safeArea,
      },
      clampZoom(state.ui.zoom),
    );
    lastMetrics = metrics;
    return metrics;
  }

  function syncCameraToCanvas() {
    const canvas = resize();
    if (!canvas) return false;
    const metrics = currentMetrics(canvas);
    const state = store.getState();
    if (
      Math.abs(metrics.camera.x - state.ui.camera.x) > 0.5
      || Math.abs(metrics.camera.y - state.ui.camera.y) > 0.5
    ) {
      engine.setCamera(metrics.camera);
      return true;
    }
    return false;
  }

  function canvasPoint(event, canvas = getCanvas()) {
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / Math.max(rect.width, 1);
    const scaleY = canvas.height / Math.max(rect.height, 1);
    return {
      x: (event.clientX - rect.left) * scaleX,
      y: (event.clientY - rect.top) * scaleY,
    };
  }

  function setCameraPosition(camera, width, height) {
    const metrics = terrainMetrics(
      width * (window.devicePixelRatio || 1),
      height * (window.devicePixelRatio || 1),
      camera,
      { cols: store.getState().world.cols, rows: store.getState().world.rows, safeArea: WORLD_LAYOUT.safeArea },
      store.getState().ui.zoom,
    );
    engine.setCamera(metrics.camera);
    return true;
  }

  function setZoomLevel(zoom) {
    engine.setZoom(zoom);
    return true;
  }

  function hitTest(point) {
    if (!lastMetrics) return null;
    const cell = pickTileFromPoint(point.x, point.y, store.getState().world, lastMetrics);
    if (!cell) return null;
    const building = buildingAt(store.getState(), cell.key);
    return building
      ? { kind: 'building', key: building.id, tileKey: cell.key }
      : { kind: 'tile', key: cell.key };
  }

  function drawTileLayer(context, metrics, state) {
    const overlay = state.ui.overlay;
    const selectedKey = selectionKey(state);
    const hoveredKey = state.ui.hoveredCell?.key ?? null;
    const previewCells = new Set(state.ui.preview?.cells ?? []);
    const invalidPreviewCells = new Set(state.ui.preview?.invalid ?? []);

    Object.values(state.world.tiles)
      .sort((left, right) => (left.x + left.y) - (right.x + right.y))
      .forEach((tile) => {
        const key = `${tile.x},${tile.y}`;
        const polygon = cellIsoPolygon(tile.x, tile.y, metrics, tile.height);
        const [baseColor, edgeColor] = terrainColor(tile);
        drawPolygon(context, polygon, baseColor, hexToRgba(edgeColor, 0.36), 1);

        const overlayFill = overlayColor(overlay, overlayValueForTile(state, key, overlay));
        if (overlayFill) {
          drawPolygon(context, polygon, overlayFill);
        }

        const zone = zoneAt(state, key);
        if (zone && !buildingAt(state, key) && !roadAt(state, key)) {
          drawPolygon(context, polygon, hexToRgba(ZONE_DEFINITIONS[zone.type].color, 0.26));
        }

        const road = roadAt(state, key);
        if (road) {
          const variant = roadVariantForKey(state.networks.roads.tiles, key);
          const traffic = state.networks.traffic.hottestRoads.find((entry) => entry.key === key)?.ratio ?? 0;
          drawRoadTile(context, polygon, road, variant, traffic);
        }

        if (previewCells.has(key)) {
          drawPolygon(
            context,
            scalePolygon(polygon, 0.92),
            invalidPreviewCells.has(key)
              ? 'rgba(255, 120, 111, 0.35)'
              : 'rgba(129, 241, 184, 0.28)',
            invalidPreviewCells.has(key)
              ? 'rgba(255, 180, 174, 0.94)'
              : 'rgba(220, 255, 237, 0.94)',
            1.3,
          );
        }

        if (selectedKey === key) {
          drawPolygon(context, polygon, null, 'rgba(255, 242, 164, 0.98)', 2.1);
        } else if (hoveredKey === key) {
          drawPolygon(context, polygon, null, 'rgba(208, 240, 255, 0.9)', 1.4);
        }
      });
  }

  function drawBuildingLayer(context, metrics, state) {
    const buildings = Object.values(state.world.buildings)
      .map((building) => {
        const tile = state.world.tiles[`${building.x},${building.y}`];
        const basePoint = isoProject(
          building.x,
          building.y,
          metrics.originX,
          metrics.originY,
          metrics.tileWidth,
          metrics.tileHeight,
          tile?.height ?? 0,
        );
        return {
          building,
          tile,
          basePoint,
        };
      })
      .sort((left, right) => (left.basePoint.y + left.tile.height * 2) - (right.basePoint.y + right.tile.height * 2));

    buildings.forEach(({ building, tile, basePoint }) => {
      const polygon = cellIsoPolygon(building.x, building.y, metrics, tile?.height ?? 0);
      const sprite = chooseBuildingSprite(building);
      const fill = BUILDING_DEFINITIONS[building.type]?.color ?? '#d0dae0';

      if (!spriteLibrary.ready || spriteLibrary.failed || !sprite) {
        drawFallbackBuilding(context, polygon, metrics.tileHeight, fill);
        return;
      }

      const image = spriteLibrary.getImage(sprite.sheet);
      if (!image) {
        drawFallbackBuilding(context, polygon, metrics.tileHeight, fill);
        return;
      }

      const source = spriteLibrary.getTrimmedAbsoluteRect(image, sprite.sourceRectPx);
      const aspectRatio = source.sh / Math.max(source.sw, 1);
      const drawWidth = metrics.tileWidth * 1.55 * (sprite.drawScale ?? 0.85);
      const drawHeight = drawWidth * aspectRatio;
      const anchorX = basePoint.x - drawWidth * 0.5;
      const anchorY = basePoint.y + metrics.tileHeight * 0.5 - drawHeight;

      context.save();
      context.shadowColor = 'rgba(0, 0, 0, 0.24)';
      context.shadowBlur = 10;
      context.shadowOffsetY = 6;
      spriteLibrary.drawSpriteCutout(
        context,
        image,
        sprite.sourceRectPx,
        anchorX,
        anchorY,
        drawWidth,
        drawHeight,
        building.status === 'No utilities' || building.status === 'Cold' ? 0.9 : 1,
      );
      context.restore();
    });
  }

  function paint() {
    spriteLibrary.ensureReady();
    const canvas = resize();
    if (!canvas) return;
    const context = canvas.getContext('2d');
    const metrics = currentMetrics(canvas);
    const state = store.getState();

    context.clearRect(0, 0, canvas.width, canvas.height);
    const sky = context.createLinearGradient(0, 0, 0, canvas.height);
    sky.addColorStop(0, '#436785');
    sky.addColorStop(0.5, '#8aa7b9');
    sky.addColorStop(1, '#1a2730');
    context.fillStyle = sky;
    context.fillRect(0, 0, canvas.width, canvas.height);

    drawTileLayer(context, metrics, state);
    drawBuildingLayer(context, metrics, state);

    context.save();
    context.fillStyle = 'rgba(7, 14, 19, 0.72)';
    context.fillRect(canvas.width - 252, 18, 214, 118);
    context.fillStyle = '#dbe7ef';
    context.font = '12px monospace';
    context.fillText(`Tool: ${TOOL_DEFINITIONS.find((tool) => tool.key === state.ui.tool)?.label ?? state.ui.tool}`, canvas.width - 232, 42);
    context.fillText(`Overlay: ${state.ui.overlay}`, canvas.width - 232, 60);
    context.fillText(`Heat ${Math.round(state.networks.heat.coverage * 100)}%`, canvas.width - 232, 78);
    context.fillText(`Power ${Math.round(state.networks.utilities.power.coverage * 100)}%`, canvas.width - 232, 96);
    context.fillText(`Water ${Math.round(state.networks.utilities.water.coverage * 100)}%`, canvas.width - 232, 114);
    context.restore();
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
