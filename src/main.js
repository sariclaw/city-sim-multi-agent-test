const app = document.querySelector('#app');
app.innerHTML = `
  <main class="shell">
    <section class="hero panel">
      <div class="hero-copy">
        <p class="eyebrow">Founding Session 01</p>
        <h1>Establish the city before the first rush hour hits.</h1>
        <p class="hero-text">
          Shape a district network, balance utilities, and prepare the civic systems
          that future simulation layers will stress-test.
        </p>
        <div class="hero-actions">
          <button class="button button-primary" type="button">Start New Charter</button>
          <button class="button button-secondary" type="button">Load Planning Draft</button>
        </div>
      </div>
      <div class="hero-signal">
        <div class="signal-card">
          <span class="signal-label">Status</span>
          <strong>Pre-Launch</strong>
          <p>Core districts mapped. Services waiting on activation logic.</p>
        </div>
        <div class="signal-grid">
          <div>
            <span>Population</span>
            <strong>48,320</strong>
          </div>
          <div>
            <span>Approval</span>
            <strong>71%</strong>
          </div>
          <div>
            <span>Treasury</span>
            <strong>$4.8M</strong>
          </div>
          <div>
            <span>Power Reserve</span>
            <strong>16 hrs</strong>
          </div>
        </div>
      </div>
    </section>

    <section class="summary-grid" aria-label="City summary">
      <article class="summary-card panel accent-cyan">
        <p>Transit Load</p>
        <strong>63%</strong>
        <span>Morning routes near capacity. Expand before industrial growth.</span>
      </article>
      <article class="summary-card panel accent-amber">
        <p>Housing Pressure</p>
        <strong>Moderate</strong>
        <span>Mixed-density permits available in three bordering districts.</span>
      </article>
      <article class="summary-card panel accent-green">
        <p>Utilities</p>
        <strong>Stable</strong>
        <span>Water and grid buffers are healthy, sanitation needs routing.</span>
      </article>
      <article class="summary-card panel accent-rose">
        <p>Civic Pulse</p>
        <strong>Watchlist</strong>
        <span>Public safety and healthcare systems still using placeholder policies.</span>
      </article>
    </section>

    <section class="workspace">
      <section class="board panel" aria-labelledby="district-board-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">District Overview</p>
            <h2 id="district-board-title">Founding Board</h2>
          </div>
          <span class="board-tag">6 active zones</span>
        </div>
        <div class="district-board" role="img" aria-label="Stylized city district map with six zones">
          <article class="district district-core">
            <span class="district-name">Civic Core</span>
            <span class="district-stat">Admin / Commerce</span>
          </article>
          <article class="district district-harbor">
            <span class="district-name">Rivergate</span>
            <span class="district-stat">Freight / Utilities</span>
          </article>
          <article class="district district-residential">
            <span class="district-name">North Steps</span>
            <span class="district-stat">Residential</span>
          </article>
          <article class="district district-industrial">
            <span class="district-name">Ironworks</span>
            <span class="district-stat">Industrial</span>
          </article>
          <article class="district district-park">
            <span class="district-name">Green Loop</span>
            <span class="district-stat">Parks / Leisure</span>
          </article>
          <article class="district district-expansion">
            <span class="district-name">South Reach</span>
            <span class="district-stat">Expansion Reserve</span>
          </article>
        </div>
        <div class="board-legend" aria-label="Board legend">
          <span><i class="swatch swatch-core"></i> Civic</span>
          <span><i class="swatch swatch-housing"></i> Housing</span>
          <span><i class="swatch swatch-industry"></i> Industry</span>
          <span><i class="swatch swatch-green"></i> Leisure</span>
        </div>
      </section>

      <aside class="control-panel panel" aria-labelledby="control-panel-title">
        <div class="section-heading">
          <div>
            <p class="eyebrow">Control Panel</p>
            <h2 id="control-panel-title">City Operations</h2>
          </div>
        </div>

        <div class="control-stack">
          <section class="control-group">
            <h3>Build Queue</h3>
            <button class="button control-button" type="button">Zone Residential Block</button>
            <button class="button control-button" type="button">Lay Transit Corridor</button>
            <button class="button control-button" type="button">Place Utility Node</button>
          </section>

          <section class="control-group">
            <h3>Systems</h3>
            <div class="status-row">
              <span>Economy Model</span>
              <strong>Placeholder</strong>
            </div>
            <div class="status-row">
              <span>Traffic AI</span>
              <strong>Queued</strong>
            </div>
            <div class="status-row">
              <span>Event Feed</span>
              <strong>Offline</strong>
            </div>
          </section>

          <section class="control-group">
            <h3>Advisory Feed</h3>
            <ul class="advisory-list">
              <li>Reserve southern land for utility-heavy expansion.</li>
              <li>Transit demand is rising faster than housing approvals.</li>
              <li>Healthcare and emergency coverage need future simulation hooks.</li>
            </ul>
          </section>
        </div>
      </aside>
    </section>
  </main>
`;
