import {
  BUDGET_LIMITS,
  OVERLAY_DEFINITIONS,
  POLICY_DEFINITIONS,
  SPEED_OPTIONS,
  TAX_RATE_LIMITS,
  TOOL_DEFINITIONS,
} from '../config/index.js';
import { hudViewModel } from '../sim/selectors.js';

function deltaButtons(kind, channel, value, min, max, step = 1) {
  return `
    <div class="inline-meter">
      <button type="button" class="tiny-button" data-${channel}="${kind}" data-delta="-${step}" ${value <= min ? 'disabled' : ''}>-</button>
      <strong>${value}</strong>
      <button type="button" class="tiny-button" data-${channel}="${kind}" data-delta="${step}" ${value >= max ? 'disabled' : ''}>+</button>
    </div>
  `;
}

function selectionMarkup(selection) {
  if (!selection) {
    return `
      <section class="floating-panel inspector-panel">
        <h3>Selection</h3>
        <p class="muted-copy">Hover and click any tile to inspect it.</p>
      </section>
    `;
  }

  if (selection.kind === 'building') {
    const building = selection.building;
    return `
      <section class="floating-panel inspector-panel">
        <h3>${building.type}</h3>
        <p class="muted-copy">Tile ${building.x}, ${building.y}</p>
        <div class="fact-grid">
          <span><b>Status</b>${building.status}</span>
          <span><b>Power</b>${Math.round((building.powerCoverage ?? 0) * 100)}%</span>
          <span><b>Water</b>${Math.round((building.waterCoverage ?? 0) * 100)}%</span>
          <span><b>Heat</b>${Math.round((building.heatCoverage ?? 0) * 100)}%</span>
          <span><b>Clinic</b>${Math.round((building.serviceCoverage?.clinic ?? 0) * 100)}%</span>
          <span><b>Fire</b>${Math.round((building.serviceCoverage?.fire ?? 0) * 100)}%</span>
        </div>
      </section>
    `;
  }

  const { tile, road, zone, building } = selection;
  return `
    <section class="floating-panel inspector-panel">
      <h3>Tile ${tile.x}, ${tile.y}</h3>
      <p class="muted-copy">${tile.type}${tile.height ? ` · elevation ${tile.height}` : ''}${tile.blocked ? ' · blocked' : ''}</p>
      <div class="fact-grid">
        <span><b>Road</b>${road ? road.kind : 'none'}</span>
        <span><b>Zone</b>${zone ? zone.type : 'none'}</span>
        <span><b>Building</b>${building ? building.type : 'none'}</span>
      </div>
    </section>
  `;
}

export function createAppView({ app, store, engine }) {
  function render() {
    const state = store.getState();
    const hud = hudViewModel(state);
    const selection = engine.selectedEntity();

    app.innerHTML = `
      <main class="app-shell">
        <section class="game-shell">
          <div class="city-map-frame">
            <canvas data-city-canvas aria-label="Isometric city canvas"></canvas>
          </div>
          <div class="stage-overlay">
            <section class="floating-panel top-hud">
              <div class="hud-row primary-row">
                <strong>${hud.cityName}</strong>
                <span class="capsule">${hud.season}</span>
                <span class="capsule cold">${hud.temperature}&deg;C</span>
                <span class="capsule">${state.simulation.paused ? 'Paused' : `Live ${engine.currentSpeedOption().label}`}</span>
              </div>
              <div class="hud-row">
                <span class="stat-pill"><small>Money</small><b>${hud.money}</b></span>
                <span class="stat-pill"><small>Pop</small><b>${hud.population}</b></span>
                <span class="stat-pill"><small>Food</small><b>${hud.food}</b></span>
                <span class="stat-pill"><small>Fuel</small><b>${hud.fuel}</b></span>
                <span class="stat-pill"><small>Hope</small><b>${hud.hope}%</b></span>
                <span class="stat-pill danger"><small>Discontent</small><b>${hud.discontent}%</b></span>
              </div>
            </section>

            <aside class="left-column">
              <section class="floating-panel tool-panel">
                <h3>Build</h3>
                <div class="button-grid">
                  ${TOOL_DEFINITIONS.map((tool) => `
                    <button class="tool-button ${tool.key === state.ui.tool ? 'is-active' : ''}" type="button" data-tool="${tool.key}">
                      <span>${tool.label}</span>
                      <small>${tool.cost ? `$${tool.cost}` : 'tool'}</small>
                    </button>
                  `).join('')}
                </div>
              </section>

              <section class="floating-panel overlay-panel">
                <h3>Overlays</h3>
                <div class="button-grid narrow">
                  ${OVERLAY_DEFINITIONS.map((overlay) => `
                    <button class="tool-button ${overlay.key === state.ui.overlay ? 'is-active' : ''}" type="button" data-overlay="${overlay.key}">
                      <span>${overlay.label}</span>
                    </button>
                  `).join('')}
                </div>
              </section>

              <section class="floating-panel controls-panel">
                <div class="toolbar-row">
                  <button class="toolbar-button ${state.simulation.paused ? 'is-active' : ''}" type="button" data-action="toggle-pause">
                    ${state.simulation.paused ? 'Resume' : 'Pause'}
                  </button>
                  <button class="toolbar-button" type="button" data-action="tick">Step</button>
                  <button class="toolbar-button" type="button" data-action="reset">Reset</button>
                </div>
                <div class="toolbar-row compact">
                  ${SPEED_OPTIONS.map((option) => `
                    <button class="speed-chip ${option.value === state.simulation.speed ? 'is-active' : ''}" type="button" data-speed="${option.value}">
                      ${option.label}
                    </button>
                  `).join('')}
                </div>
              </section>
            </aside>

            <aside class="side-column">
              ${selectionMarkup(selection)}

              <section class="floating-panel inspector-panel">
                <h3>Policies</h3>
                <div class="stack-list">
                  ${POLICY_DEFINITIONS.map((policy) => `
                    <button class="policy-row ${state.city.policies[policy.key] ? 'is-active' : ''}" type="button" data-policy="${policy.key}">
                      <span>${policy.label}</span>
                      <small>${policy.description}</small>
                    </button>
                  `).join('')}
                </div>
              </section>

              <section class="floating-panel inspector-panel">
                <h3>Taxes</h3>
                <div class="meter-list">
                  <div class="meter-row"><span>Residential</span>${deltaButtons('residential', 'tax', state.city.economy.taxes.residential, TAX_RATE_LIMITS.min, TAX_RATE_LIMITS.max, TAX_RATE_LIMITS.step)}</div>
                  <div class="meter-row"><span>Commercial</span>${deltaButtons('commercial', 'tax', state.city.economy.taxes.commercial, TAX_RATE_LIMITS.min, TAX_RATE_LIMITS.max, TAX_RATE_LIMITS.step)}</div>
                  <div class="meter-row"><span>Industrial</span>${deltaButtons('industrial', 'tax', state.city.economy.taxes.industrial, TAX_RATE_LIMITS.min, TAX_RATE_LIMITS.max, TAX_RATE_LIMITS.step)}</div>
                </div>
              </section>

              <section class="floating-panel inspector-panel">
                <h3>Budgets</h3>
                <div class="meter-list">
                  <div class="meter-row"><span>Clinic</span>${deltaButtons('clinic', 'budget', state.city.economy.budget.clinic, BUDGET_LIMITS.min, BUDGET_LIMITS.max, BUDGET_LIMITS.step)}</div>
                  <div class="meter-row"><span>Fire</span>${deltaButtons('fire', 'budget', state.city.economy.budget.fire, BUDGET_LIMITS.min, BUDGET_LIMITS.max, BUDGET_LIMITS.step)}</div>
                  <div class="meter-row"><span>Heat</span>${deltaButtons('heat', 'budget', state.city.economy.budget.heat, BUDGET_LIMITS.min, BUDGET_LIMITS.max, BUDGET_LIMITS.step)}</div>
                </div>
              </section>

              <section class="floating-panel inspector-panel log-panel">
                <h3>Event Log</h3>
                <div class="stack-list passive">
                  ${state.simulation.events.slice(0, 8).map((event) => `<p>${event}</p>`).join('')}
                </div>
              </section>
            </aside>
          </div>
        </section>
      </main>
    `;
  }

  return { render };
}
