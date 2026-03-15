# New Stonehaven

Browser-only isometric city builder prototype that blends:
- `SimCity` zoning and utilities
- `Cities: Skylines`-style road pressure and service coverage
- `Frostpunk` temperature, heat, fuel, hope, and discontent

## Current MVP
- Tile-based handcrafted map with river, hills, blocked rock, and camera/zoom
- Tools for roads, avenues, zoning, utilities, services, heat, and bulldozing
- Auto-growing low-density `R/C/I` buildings once roads and utilities exist
- Road-network utility propagation for power and water
- Radial heat coverage from heat plants and steam hubs
- Aggregated traffic load on the road graph
- Economy loop with money, food, fuel, taxes, and service budgets
- Climate loop with seasons, deterministic cold waves, hope, discontent, sickness, and collapse conditions

## Controls
- Left click / drag: build with the active tool
- `Shift + Click`: inspect a tile/building without building
- Mouse wheel: zoom
- Right click, middle click, or hold `Space` + drag: pan camera

## Run
```bash
npm start
```

## Test
```bash
npm test
```
