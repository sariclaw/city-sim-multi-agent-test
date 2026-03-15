export function createAppController({ app, store, engine, renderer }) {
  let boundCanvas = null;
  let pointerHandlers = null;
  let dragState = null;
  let keyboardPan = false;

  function normalizedWheelDelta(event) {
    if (event.deltaMode === WheelEvent.DOM_DELTA_LINE) return event.deltaY * 16;
    if (event.deltaMode === WheelEvent.DOM_DELTA_PAGE) return event.deltaY * window.innerHeight;
    return event.deltaY;
  }

  function zoomFromWheelEvent(event, canvas) {
    const delta = normalizedWheelDelta(event);
    if (!delta) return false;
    event.preventDefault();
    const zoomFactor = Math.exp(-delta * 0.0022);
    return renderer.setZoomLevel(store.getState().ui.zoom * zoomFactor, renderer.canvasPoint(event, canvas), canvas.clientWidth, canvas.clientHeight);
  }

  function bindCanvas() {
    const canvas = renderer.getCanvas();
    if (!canvas || canvas === boundCanvas) return;

    if (boundCanvas && pointerHandlers) {
      boundCanvas.removeEventListener('pointerdown', pointerHandlers.pointerdown);
      boundCanvas.removeEventListener('pointermove', pointerHandlers.pointermove);
      boundCanvas.removeEventListener('pointerup', pointerHandlers.pointerup);
      boundCanvas.removeEventListener('pointerleave', pointerHandlers.pointerleave);
      boundCanvas.removeEventListener('pointercancel', pointerHandlers.pointercancel);
      boundCanvas.removeEventListener('contextmenu', pointerHandlers.contextmenu);
      boundCanvas.removeEventListener('wheel', pointerHandlers.wheel);
    }

    pointerHandlers = {
      pointerdown(event) {
        const point = renderer.canvasPoint(event, canvas);
        const hit = renderer.hitTest(point);

        if (event.button === 1 || event.button === 2 || keyboardPan) {
          dragState = {
            mode: 'pan',
            pointerId: event.pointerId,
            origin: point,
            startCamera: { ...store.getState().ui.camera },
          };
          canvas.setPointerCapture(event.pointerId);
          canvas.style.cursor = 'grabbing';
          return;
        }

        if (event.shiftKey && hit?.key) {
          engine.selectAt(hit.tileKey ?? hit.key);
          return;
        }

        const cell = hit?.tileKey ?? hit?.key;
        if (!cell) return;
        const [x, y] = cell.split(',').map(Number);
        dragState = {
          mode: 'paint',
          pointerId: event.pointerId,
          moved: false,
        };
        canvas.setPointerCapture(event.pointerId);
        engine.beginPlacementPreview({ x, y });
      },
      pointermove(event) {
        const point = renderer.canvasPoint(event, canvas);
        const hit = renderer.hitTest(point);
        const cellKey = hit?.tileKey ?? hit?.key ?? null;

        if (cellKey) {
          const [x, y] = cellKey.split(',').map(Number);
          engine.updateCursorCell({ x, y });
        } else {
          engine.updateCursorCell(null);
        }

        if (!dragState || dragState.pointerId !== event.pointerId) return;

        if (dragState.mode === 'pan') {
          const dx = point.x - dragState.origin.x;
          const dy = point.y - dragState.origin.y;
          renderer.setCameraPosition(
            { x: dragState.startCamera.x + dx, y: dragState.startCamera.y + dy },
            canvas.clientWidth,
            canvas.clientHeight,
          );
          return;
        }

        if (dragState.mode === 'paint' && cellKey) {
          dragState.moved = true;
          const [x, y] = cellKey.split(',').map(Number);
          engine.updatePlacementPreview({ x, y });
        }
      },
      pointerup(event) {
        if (!dragState || dragState.pointerId !== event.pointerId) return;
        try {
          canvas.releasePointerCapture(event.pointerId);
        } catch {
          // ignore
        }

        if (dragState.mode === 'pan') {
          canvas.style.cursor = 'crosshair';
          dragState = null;
          return;
        }

        engine.commitPlacement();
        dragState = null;
      },
      pointerleave() {
        engine.updateCursorCell(null);
      },
      pointercancel() {
        dragState = null;
        engine.cancelPlacementPreview();
      },
      contextmenu(event) {
        event.preventDefault();
      },
      wheel(event) {
        zoomFromWheelEvent(event, canvas);
      },
    };

    canvas.style.cursor = 'crosshair';
    canvas.addEventListener('pointerdown', pointerHandlers.pointerdown);
    canvas.addEventListener('pointermove', pointerHandlers.pointermove);
    canvas.addEventListener('pointerup', pointerHandlers.pointerup);
    canvas.addEventListener('pointerleave', pointerHandlers.pointerleave);
    canvas.addEventListener('pointercancel', pointerHandlers.pointercancel);
    canvas.addEventListener('contextmenu', pointerHandlers.contextmenu);
    canvas.addEventListener('wheel', pointerHandlers.wheel, { passive: false });
    boundCanvas = canvas;
  }

  app.addEventListener('click', (event) => {
    const button = event.target.closest('button');
    if (!button) return;

    if (button.dataset.action === 'toggle-pause') engine.togglePause();
    if (button.dataset.action === 'tick') engine.tickSimulation();
    if (button.dataset.action === 'reset') engine.resetGame();
    if (button.dataset.speed) engine.setSpeed(Number(button.dataset.speed));
    if (button.dataset.tool) engine.selectTool(button.dataset.tool);
    if (button.dataset.overlay) engine.setOverlayMode(button.dataset.overlay);
    if (button.dataset.policy) engine.togglePolicy(button.dataset.policy);

    if (button.dataset.tax && button.dataset.delta) {
      const key = button.dataset.tax;
      const next = store.getState().city.economy.taxes[key] + Number(button.dataset.delta);
      engine.setTaxRate(key, next);
    }

    if (button.dataset.budget && button.dataset.delta) {
      const key = button.dataset.budget;
      const next = store.getState().city.economy.budget[key] + Number(button.dataset.delta);
      engine.setBudget(key, next);
    }
  });

  window.addEventListener('resize', () => {
    renderer.syncCameraToCanvas();
    renderer.paint();
  });

  window.addEventListener('keydown', (event) => {
    if (event.code === 'Space') keyboardPan = true;
  });

  window.addEventListener('keyup', (event) => {
    if (event.code === 'Space') keyboardPan = false;
  });

  return {
    bindCanvas,
  };
}
