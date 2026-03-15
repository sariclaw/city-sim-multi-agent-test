import { ACTION_LIMIT, ACTIONS, SPEED_OPTIONS } from '../config/index.js';

export function createAppView({ app, store, engine }) {
  function speedButtonsMarkup() {
    const state = store.getState();
    return SPEED_OPTIONS.map((option) => `
      <button class="speed-chip ${option.value === state.sim.speed ? 'is-active' : ''}" type="button" data-speed="${option.value}" ${state.gameOver ? 'disabled' : ''}>${option.label}</button>
    `).join('');
  }

  function effectSummary(effects) {
    const fragments = [];
    if (effects.housing) fragments.push(`+${effects.housing} housing`);
    if (effects.jobs) fragments.push(`+${effects.jobs} jobs`);
    if (effects.powerSupply) fragments.push(`+${effects.powerSupply} power`);
    if (effects.waterSupply) fragments.push(`+${effects.waterSupply} water`);
    if (effects.serviceSupply) fragments.push(`+${effects.serviceSupply} services`);
    if (effects.food) fragments.push(`+${effects.food} food`);
    if (effects.production) fragments.push(`+${effects.production} production`);
    if (effects.revenueBase) fragments.push(`+${effects.revenueBase} trade`);
    if (effects.powerDemand) fragments.push(`+${effects.powerDemand} load`);
    return fragments.slice(0, 3).join(' · ');
  }

  function inspectorMarkup() {
    const state = store.getState();
    const systems = state.city.systems;
    const selection = engine.selectedEntity();

    if (selection.kind === 'asset' && selection.asset && selection.district) {
      const actionKey = engine.assetActionKey(selection.asset);
      const effects = engine.resolveAssetEffects(selection.asset);
      return `
        <section class="floating-panel inspector" aria-label="Selection panel">
          <div class="panel-head compact-head">
            <span class="panel-kicker">Asset</span>
            <div class="panel-title-row">
              <strong>${selection.asset.label}</strong>
              <span class="status-pill">L${selection.asset.level}/${selection.asset.maxLevel}</span>
            </div>
            <p class="panel-status">${selection.district.label} · ${effectSummary(effects) || 'local support'}</p>
          </div>
          <div class="fact-grid compact-grid">
            <div class="fact-chip"><span>Growth</span><strong>${selection.district.growthTrend > 0 ? '+' : ''}${selection.district.growthTrend.toFixed(1)}</strong></div>
            <div class="fact-chip"><span>Unrest</span><strong>${Math.round(selection.district.localUnrest)}%</strong></div>
            <div class="fact-chip"><span>Power</span><strong>${systems.utilities.power.coveragePercent}%</strong></div>
            <div class="fact-chip"><span>Water</span><strong>${systems.utilities.water.coveragePercent}%</strong></div>
          </div>
          <div class="panel-actions compact-actions">
            <button class="action-chip is-primary" type="button" data-build="${actionKey}" ${!actionKey || state.actionsLeft <= 0 || state.gameOver || selection.asset.level >= selection.asset.maxLevel ? 'disabled' : ''}>${selection.asset.level >= selection.asset.maxLevel ? 'Maxed' : `Upgrade · ${engine.actionLabel(actionKey)}`}</button>
            <button class="action-chip" type="button" data-select-district="${selection.district.key}">District</button>
          </div>
        </section>
      `;
    }

    const district = selection.district ?? engine.getDistrictByKey('civic');
    const districtAssets = state.city.assets.filter((asset) => asset.districtKey === district.key);

    return `
      <section class="floating-panel inspector" aria-label="Selection panel">
        <div class="panel-head compact-head">
          <span class="panel-kicker">District</span>
          <div class="panel-title-row">
            <strong>${district.label}</strong>
            <span class="status-pill">${district.status}</span>
          </div>
          <p class="panel-status">${Math.round(district.residents)} housed · ${Math.round(district.jobsFilled)} jobs · Dev ${Math.round(district.development * 100)}%</p>
        </div>
        <div class="fact-grid compact-grid">
          <div class="fact-chip"><span>Growth</span><strong>${district.growthTrend > 0 ? '+' : ''}${district.growthTrend.toFixed(1)}</strong></div>
          <div class="fact-chip"><span>Utility</span><strong>${Math.round(district.metrics.utilityLoad * 100)}%</strong></div>
          <div class="fact-chip"><span>Service</span><strong>${Math.round(district.metrics.servicePressure * 100)}%</strong></div>
          <div class="fact-chip"><span>Unrest</span><strong>${Math.round(district.localUnrest)}%</strong></div>
        </div>
        <div class="panel-actions compact-actions two-col-actions">
          ${ACTIONS.map((action) => `
            <button class="action-chip ${engine.selectedAssetForAction(action.key) ? 'is-primary' : ''}" type="button" data-build="${action.key}" ${state.actionsLeft <= 0 || state.gameOver ? 'disabled' : ''}>${action.label}</button>
          `).join('')}
        </div>
        ${districtAssets.length ? `
          <div class="mini-grid asset-list">
            ${districtAssets.map((asset) => `
              <button class="mini-card mini-card-button" type="button" data-select-asset="${asset.key}">
                <span class="mini-label">${asset.label}</span>
                <strong>L${asset.level}/${asset.maxLevel}</strong>
              </button>
            `).join('')}
          </div>
        ` : ''}
      </section>
    `;
  }

  function render() {
    const state = store.getState();
    const resources = state.city.resources;
    const systems = state.city.systems;
    const modeClass = state.gameOver ? 'status-danger' : state.sim.paused ? 'status-paused' : 'status-live';
    const selected = engine.selectedEntity();
    const selectedLabel =
      selected.kind === 'asset' && selected.asset ? selected.asset.label
      : selected.district?.label ?? 'Civic Core';

    app.innerHTML = `
      <main class="app-shell">
        <section class="game-shell">
          <div class="city-stage">
            <div class="city-map-frame">
              <canvas data-city-canvas aria-label="Interactive city canvas with districts and upgrade assets"></canvas>
            </div>
            <div class="stage-overlay">
              <section class="floating-panel hud compact-hud" aria-label="City HUD">
                <div class="hud-line hud-line-primary">
                  <strong>${state.cityName}</strong>
                  <span class="capsule ${modeClass}">${state.gameOver ? 'Collapse' : state.sim.paused ? 'Paused' : `Live ${engine.currentSpeedOption().label}`}</span>
                  <span class="capsule">${engine.currentSeason()} · Y${state.year}</span>
                  <span class="capsule">Acts ${state.actionsLeft}/${ACTION_LIMIT}</span>
                </div>
                <div class="hud-line hud-line-stats">
                  <span class="stat-chip"><span class="chip-label">Pop</span><strong>${Math.round(resources.population)}</strong></span>
                  <span class="stat-chip"><span class="chip-label">$</span><strong>${Math.round(resources.treasury)}</strong></span>
                  <span class="stat-chip"><span class="chip-label">Mood</span><strong>${Math.round(systems.mood.satisfaction)}%</strong></span>
                  <span class="stat-chip"><span class="chip-label">Unrest</span><strong>${Math.round(resources.unrest)}%</strong></span>
                </div>
              </section>

              <section class="floating-panel controls-panel" aria-label="City controls">
                <div class="toolbar-row control-row-main">
                  <button class="toolbar-toggle ${state.sim.paused ? 'is-primary' : ''}" type="button" data-action="toggle-pause" ${state.gameOver ? 'disabled' : ''}>${state.sim.paused ? 'Resume' : 'Pause'}</button>
                  <button class="toolbar-toggle" type="button" data-action="advance" ${state.gameOver ? 'disabled' : ''}>Next</button>
                  <button class="toolbar-toggle" type="button" data-action="reset">Reset</button>
                </div>
                <div class="toolbar-row control-row-speed">
                  <span class="toolbar-label">Speed</span>
                  <div class="speed-track">${speedButtonsMarkup()}</div>
                </div>
              </section>

              <section class="floating-panel ticker compact-ticker" aria-label="System ticker">
                <div class="ticker-row">
                  <strong>${selectedLabel}</strong>
                  <span>Housing ${Math.round(systems.housing.capacity)} / ${Math.round(resources.population)}</span>
                </div>
                <div class="ticker-row muted-row">
                  <span>${state.log[0]}</span>
                </div>
              </section>

              <div class="inspector-column">
                ${inspectorMarkup()}
              </div>
            </div>
          </div>
        </section>
      </main>
    `;
  }

  return {
    render,
  };
}
