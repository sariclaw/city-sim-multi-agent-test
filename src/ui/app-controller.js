export function createAppController({ app, store, engine, renderer }) {
  let resizeQueued = false;
  let cameraDrag = null;
  let boundCanvas = null;
  let canvasHandlers = null;

  function normalizedWheelDelta(event) {
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
    return event.deltaY;
  }

  function pointInsideCanvas(event, canvas) {
    const rect = canvas.getBoundingClientRect();
    return (
      event.clientX >= rect.left
      && event.clientX <= rect.right
      && event.clientY >= rect.top
      && event.clientY <= rect.bottom
    );
  }

  function wheelTargetsPanel(event) {
    return event.target instanceof Element && Boolean(event.target.closest('.floating-panel, .inspector-column'));
  }

  function zoomFromWheelEvent(event, canvas) {
    if (event.defaultPrevented || !canvas || wheelTargetsPanel(event) || !pointInsideCanvas(event, canvas)) {
      return false;
    }

    const delta = normalizedWheelDelta(event);
    if (!delta) return false;

    event.preventDefault();
    const zoomFactor = Math.exp(-delta * 0.0022);
    const point = renderer.canvasPoint(event, canvas);
    return renderer.setZoomLevel(
      store.getState().ui.zoom * zoomFactor,
      point,
      canvas.clientWidth,
      canvas.clientHeight,
    );
  }

  function bindCanvas() {
    const canvas = renderer.getCanvas();
    if (!canvas || canvas === boundCanvas) return;

    if (boundCanvas && canvasHandlers) {
      boundCanvas.removeEventListener('pointerdown', canvasHandlers.pointerdown);
      boundCanvas.removeEventListener('pointermove', canvasHandlers.pointermove);
      boundCanvas.removeEventListener('pointerleave', canvasHandlers.pointerleave);
      boundCanvas.removeEventListener('pointerup', canvasHandlers.pointerup);
      boundCanvas.removeEventListener('pointercancel', canvasHandlers.pointercancel);
      boundCanvas.removeEventListener('wheel', canvasHandlers.wheel);
    }

    canvas.style.cursor = 'grab';

    canvasHandlers = {
      pointerdown(event) {
        const point = renderer.canvasPoint(event, canvas);
        cameraDrag = {
          pointerId: event.pointerId,
          startPoint: point,
          startCamera: { ...store.getState().ui.camera },
          moved: false,
        };
        canvas.setPointerCapture(event.pointerId);
        canvas.style.cursor = 'grabbing';
      },
      pointermove(event) {
        if (cameraDrag && cameraDrag.pointerId === event.pointerId) {
          const point = renderer.canvasPoint(event, canvas);
          const deltaX = point.x - cameraDrag.startPoint.x;
          const deltaY = point.y - cameraDrag.startPoint.y;
          if (Math.abs(deltaX) > 3 || Math.abs(deltaY) > 3) {
            cameraDrag.moved = true;
            engine.clearHoveredTarget();
          }
          renderer.setCameraPosition({
            x: cameraDrag.startCamera.x + deltaX,
            y: cameraDrag.startCamera.y + deltaY,
          }, canvas.clientWidth, canvas.clientHeight);
          return;
        }

        const point = renderer.canvasPoint(event, canvas);
        const hit = renderer.hitTest(point);
        const currentHover = store.getState().ui.hoveredTarget;
        const next = hit ? { kind: hit.kind, key: hit.key } : null;
        if ((next?.kind ?? null) === (currentHover?.kind ?? null) && (next?.key ?? null) === (currentHover?.key ?? null)) {
          return;
        }
        canvas.style.cursor = hit ? 'pointer' : 'grab';
        engine.setHoveredTarget(next);
      },
      pointerleave() {
        if (cameraDrag) return;
        canvas.style.cursor = 'grab';
        engine.clearHoveredTarget();
      },
      pointerup(event) {
        if (!cameraDrag || cameraDrag.pointerId !== event.pointerId) return;
        const dragged = cameraDrag.moved;
        cameraDrag = null;
        canvas.style.cursor = 'grab';
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          // Ignore release errors when the pointer capture is already gone.
        }
        if (dragged) return;
        const point = renderer.canvasPoint(event, canvas);
        const hit = renderer.hitTest(point);
        if (!hit) return;
        if (hit.kind === 'asset') engine.selectAsset(hit.key);
        if (hit.kind === 'district') engine.selectDistrict(hit.key);
      },
      pointercancel(event) {
        if (!cameraDrag || cameraDrag.pointerId !== event.pointerId) return;
        cameraDrag = null;
        canvas.style.cursor = 'grab';
      },
      wheel(event) {
        zoomFromWheelEvent(event, canvas);
      },
    };

    canvas.addEventListener('pointerdown', canvasHandlers.pointerdown);
    canvas.addEventListener('pointermove', canvasHandlers.pointermove);
    canvas.addEventListener('pointerleave', canvasHandlers.pointerleave);
    canvas.addEventListener('pointerup', canvasHandlers.pointerup);
    canvas.addEventListener('pointercancel', canvasHandlers.pointercancel);
    canvas.addEventListener('wheel', canvasHandlers.wheel, { passive: false });
    boundCanvas = canvas;
  }

  app.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    const { action, build, speed, selectDistrict: districtKey, selectAsset: assetKey } = button.dataset;
    if (action === 'advance') engine.rushSeason();
    if (action === 'toggle-pause') engine.togglePause();
    if (action === 'reset') engine.resetGame();
    if (build) engine.applyAction(build);
    if (speed) engine.setSpeed(Number(speed));
    if (districtKey) engine.selectDistrict(districtKey);
    if (assetKey) engine.selectAsset(assetKey);
  });

  window.addEventListener('resize', () => {
    if (resizeQueued) return;
    resizeQueued = true;
    window.requestAnimationFrame(() => {
      resizeQueued = false;
      if (!renderer.syncCameraToCanvas()) {
        renderer.resize();
      }
    });
  });

  window.addEventListener('wheel', (event) => {
    const canvas = renderer.getCanvas();
    if (!canvas) return;
    zoomFromWheelEvent(event, canvas);
  }, { passive: false });

  return {
    bindCanvas,
  };
}
