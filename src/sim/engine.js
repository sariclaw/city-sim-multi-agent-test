import {
  ACTION_LIMIT,
  ACTIONS,
  DISTRICT_MODELS,
  LOG_LIMIT,
  SEASONS,
  SPEED_OPTIONS,
  TICKS_PER_SEASON,
} from '../config/index.js';
import { mergeState } from '../state/store.js';

function clamp(value, min, max) {
  return Math.max(min, Math.min(max, value));
}

function lerp(start, end, amount) {
  return start + (end - start) * amount;
}

function roundNumber(value, digits = 1) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function createEngine(store) {
  function getState() {
    return store.getState();
  }

  function currentSeason() {
    const state = getState();
    return SEASONS[state.seasonIndex];
  }

  function nextSeason() {
    const state = getState();
    return SEASONS[(state.seasonIndex + 1) % SEASONS.length];
  }

  function currentSpeedOption() {
    const state = getState();
    return SPEED_OPTIONS.find((option) => option.value === state.sim.speed) ?? SPEED_OPTIONS[0];
  }

  function currentTickMs() {
    return currentSpeedOption().tickMs;
  }

  function seasonProfile(season) {
    switch (season) {
      case 'Spring':
        return { food: 1.08, growth: 0.45, utility: 1, upkeep: 1, mood: 4 };
      case 'Summer':
        return { food: 1.18, growth: 0.22, utility: 0.98, upkeep: 0.98, mood: 1 };
      case 'Autumn':
        return { food: 1.26, growth: 0.08, utility: 1, upkeep: 1.02, mood: 0 };
      case 'Winter':
        return { food: 0.6, growth: -0.38, utility: 1.15, upkeep: 1.12, mood: -8 };
      default:
        return { food: 1, growth: 0, utility: 1, upkeep: 1, mood: 0 };
    }
  }

  function toneFromRatio(value, good = 1.04, warn = 0.92) {
    if (value >= good) return 'good';
    if (value >= warn) return 'warn';
    return 'danger';
  }

  function toneFromPercent(value, highGood = 65, lowWarn = 42) {
    if (value >= highGood) return 'good';
    if (value >= lowWarn) return 'warn';
    return 'danger';
  }

  function logEvent(message) {
    const state = getState();
    state.log.unshift(`${currentSeason()} Y${state.year}: ${message}`);
    state.log = state.log.slice(0, LOG_LIMIT);
  }

  function getDistrictByKey(key) {
    return getState().city.districts.find((district) => district.key === key);
  }

  function getAssetByKey(key) {
    return getState().city.assets.find((asset) => asset.key === key);
  }

  function selectDistrict(key) {
    if (!getDistrictByKey(key)) return false;
    store.update((state) => {
      state.ui.selection = { kind: 'district', key };
    }, { reason: 'selection' });
    return true;
  }

  function selectAsset(key) {
    if (!getAssetByKey(key)) return false;
    store.update((state) => {
      state.ui.selection = { kind: 'asset', key };
    }, { reason: 'selection' });
    return true;
  }

  function setHoveredTarget(target) {
    store.update((state) => {
      state.ui.hoveredTarget = target;
    }, { reason: 'canvas-hover' });
  }

  function clearHoveredTarget() {
    const state = getState();
    if (!state.ui.hoveredTarget) return false;
    setHoveredTarget(null);
    return true;
  }

  function resolveAssetEffects(asset) {
    return Object.fromEntries(
      Object.entries(asset.effects).map(([key, value]) => [key, value * asset.level]),
    );
  }

  function assetEffectsForDistrict(districtKey) {
    return getState().city.assets
      .filter((asset) => asset.districtKey === districtKey)
      .map(resolveAssetEffects)
      .reduce((totals, effects) => {
        Object.entries(effects).forEach(([key, value]) => {
          totals[key] = (totals[key] ?? 0) + value;
        });
        return totals;
      }, {});
  }

  function capacityFromDistrict(district, season) {
    const base = DISTRICT_MODELS[district.type];
    const assetEffects = assetEffectsForDistrict(district.key);
    const developmentFactor = 0.64 + district.development * 0.76;
    const conditionFactor = 0.68 + district.condition * 0.52;
    const outputFactor = developmentFactor * conditionFactor;
    const utilityFactor = conditionFactor * season.utility;

    return {
      housing: Math.max(0, ((base.housing ?? 0) + (assetEffects.housing ?? 0)) * developmentFactor),
      jobs: Math.max(0, ((base.jobs ?? 0) + (assetEffects.jobs ?? 0)) * outputFactor),
      food: Math.max(0, ((base.food ?? 0) + (assetEffects.food ?? 0)) * outputFactor * season.food),
      powerSupply: Math.max(0, ((base.powerSupply ?? 0) + (assetEffects.powerSupply ?? 0)) * utilityFactor),
      waterSupply: Math.max(0, ((base.waterSupply ?? 0) + (assetEffects.waterSupply ?? 0)) * utilityFactor),
      serviceSupply: Math.max(0, ((base.serviceSupply ?? 0) + (assetEffects.serviceSupply ?? 0)) * outputFactor),
      transitSupply: Math.max(0, ((base.transitSupply ?? 0) + (assetEffects.transitSupply ?? 0)) * outputFactor),
      production: Math.max(0, ((base.production ?? 0) + (assetEffects.production ?? 0)) * outputFactor),
      revenueBase: Math.max(0, ((base.revenueBase ?? 0) + (assetEffects.revenueBase ?? 0)) * outputFactor),
      powerDemandBase: Math.max(0, ((base.powerDemand ?? 0) + (assetEffects.powerDemand ?? 0)) * outputFactor),
      waterDemandBase: Math.max(0, ((base.waterDemand ?? 0) + (assetEffects.waterDemand ?? 0)) * outputFactor),
      serviceNeedBase: Math.max(0, ((base.serviceNeed ?? 0) + (assetEffects.serviceNeed ?? 0)) * developmentFactor),
      transitDemandBase: Math.max(0, ((base.transitDemand ?? 0) + (assetEffects.transitDemand ?? 0)) * developmentFactor),
      upkeep: Math.max(0, ((base.upkeep ?? 0) + (assetEffects.upkeep ?? 0)) * season.upkeep * (0.82 + district.development * 0.4)),
      appeal: (base.appeal ?? 0) + (assetEffects.appeal ?? 0) + district.condition * 0.12 + district.development * 0.08,
      stability: (base.stability ?? 0) + (assetEffects.stability ?? 0) - (assetEffects.pollution ?? 0) * 0.28,
      pollution: assetEffects.pollution ?? 0,
    };
  }

  function calculateSnapshot() {
    const state = getState();
    const season = seasonProfile(currentSeason());
    const population = state.city.resources.population;
    const laborPool = population * 0.58;
    const districtCaps = state.city.districts.map((district) => ({
      district,
      capacities: capacityFromDistrict(district, season),
    }));

    const housingWeights = districtCaps.reduce((sum, entry) => {
      if (entry.capacities.housing <= 0) return sum;
      return sum + entry.capacities.housing * Math.max(0.35, entry.capacities.appeal);
    }, 0);

    districtCaps.forEach((entry) => {
      const weight = entry.capacities.housing > 0
        ? (entry.capacities.housing * Math.max(0.35, entry.capacities.appeal)) / Math.max(housingWeights, 1)
        : 0;
      entry.residents = Math.min(entry.capacities.housing, population * weight);
    });

    const jobsCapacity = districtCaps.reduce((sum, entry) => sum + entry.capacities.jobs, 0);
    const laborDemand = Math.min(laborPool, jobsCapacity);
    const jobWeights = districtCaps.reduce((sum, entry) => {
      if (entry.capacities.jobs <= 0) return sum;
      return sum + entry.capacities.jobs * Math.max(0.25, 0.45 + entry.capacities.appeal);
    }, 0);

    districtCaps.forEach((entry) => {
      const weight = entry.capacities.jobs > 0
        ? (entry.capacities.jobs * Math.max(0.25, 0.45 + entry.capacities.appeal)) / Math.max(jobWeights, 1)
        : 0;
      entry.jobsFilled = Math.min(entry.capacities.jobs, laborDemand * weight);
    });

    const totals = districtCaps.reduce((sum, entry) => {
      sum.housing += entry.capacities.housing;
      sum.jobs += entry.capacities.jobs;
      sum.foodProduction += entry.capacities.food;
      sum.powerSupply += entry.capacities.powerSupply;
      sum.waterSupply += entry.capacities.waterSupply;
      sum.serviceSupply += entry.capacities.serviceSupply;
      sum.transitSupply += entry.capacities.transitSupply;
      sum.production += entry.capacities.production;
      sum.revenueBase += entry.capacities.revenueBase;
      sum.upkeep += entry.capacities.upkeep;
      sum.powerDemandBase += entry.capacities.powerDemandBase;
      sum.waterDemandBase += entry.capacities.waterDemandBase;
      sum.serviceNeedBase += entry.capacities.serviceNeedBase;
      sum.transitDemandBase += entry.capacities.transitDemandBase;
      sum.pollution += entry.capacities.pollution;
      return sum;
    }, {
      housing: 0,
      jobs: 0,
      foodProduction: 0,
      powerSupply: 0,
      waterSupply: 0,
      serviceSupply: 0,
      transitSupply: 0,
      production: 0,
      revenueBase: 0,
      upkeep: 0,
      powerDemandBase: 0,
      waterDemandBase: 0,
      serviceNeedBase: 0,
      transitDemandBase: 0,
      pollution: 0,
    });

    const housingShortage = Math.max(0, population - totals.housing);
    const employed = districtCaps.reduce((sum, entry) => sum + entry.jobsFilled, 0);
    const employmentRate = laborPool > 0 ? employed / laborPool : 1;
    const powerDemand = population * 0.22 + employed * 0.07 + totals.powerDemandBase;
    const waterDemand = population * 0.2 + employed * 0.05 + totals.waterDemandBase;
    const serviceNeed = population * 0.19 + totals.serviceNeedBase + state.city.resources.unrest * 0.18;
    const transitDemand = population * 0.15 + employed * 0.1 + totals.transitDemandBase;
    const powerCoverage = totals.powerSupply / Math.max(powerDemand, 1);
    const waterCoverage = totals.waterSupply / Math.max(waterDemand, 1);
    const utilityCoverage = Math.min(powerCoverage, waterCoverage);
    const serviceCoverage = totals.serviceSupply / Math.max(serviceNeed, 1);
    const congestionRatio = transitDemand / Math.max(totals.transitSupply, 1);
    const foodDemand = population * 0.18;
    const foodBufferRatio = state.city.resources.food / Math.max(foodDemand * 5, 1);
    const utilityPenalty = Math.max(0, 1 - utilityCoverage) * 38;
    const servicePenalty = Math.max(0, 1 - serviceCoverage) * 26;
    const housingPenalty = housingShortage * 1.5;
    const jobsPenalty = Math.max(0, 1 - employmentRate) * 16;
    const congestionPenalty = Math.max(0, congestionRatio - 1) * 24;
    const debtPenalty = state.city.resources.treasury < 0 ? Math.abs(state.city.resources.treasury) / 5 : 0;
    const foodPenalty = foodBufferRatio < 0.45 ? (0.45 - foodBufferRatio) * 42 : 0;
    const satisfaction = clamp(
      84
        + season.mood
        - utilityPenalty
        - servicePenalty
        - housingPenalty
        - jobsPenalty
        - congestionPenalty
        - debtPenalty
        - foodPenalty
        - totals.pollution * 0.22,
      4,
      96,
    );
    const unrestTarget = clamp(100 - satisfaction + totals.pollution * 0.24, 6, 100);
    const efficiency = clamp(Math.min(utilityCoverage, serviceCoverage, 1.2) - Math.max(0, congestionRatio - 1) * 0.3, 0.45, 1.15);
    const production = totals.production * efficiency * lerp(0.72, 1.02, employmentRate);
    const revenue = totals.revenueBase * lerp(0.6, 1.04, employmentRate) * efficiency + production * 0.48;
    const upkeep = totals.upkeep + Math.max(0, 1 - utilityCoverage) * 8 + Math.max(0, congestionRatio - 1) * 6;
    const treasuryDelta = revenue - upkeep;
    const foodDelta = totals.foodProduction - foodDemand;
    const housingDemand = clamp(Math.round(4 + housingShortage / 5 + Math.max(0, 72 - satisfaction) / 8), 1, 10);
    const jobsDemand = clamp(Math.round(3 + Math.max(0, 1 - employmentRate) * 9), 1, 10);
    const utilitiesDemand = clamp(Math.round(3 + Math.max(0, 1 - utilityCoverage) * 11), 1, 10);
    const servicesDemand = clamp(Math.round(3 + Math.max(0, 1 - serviceCoverage) * 9 + state.city.resources.unrest / 22), 1, 10);
    const transitDemandScore = clamp(Math.round(3 + Math.max(0, congestionRatio - 1) * 10), 1, 10);
    const growthPressure = clamp(
      ((totals.housing - population) / 26) + ((satisfaction - 52) / 22) + season.growth + (employmentRate - 0.9) * 12,
      -4,
      8,
    );
    const declinePressure = clamp(
      (housingShortage / 14)
        + Math.max(0, 1 - utilityCoverage) * 5
        + Math.max(0, congestionRatio - 1) * 4
        + state.city.resources.unrest / 28
        + debtPenalty / 5,
      0,
      10,
    );

    districtCaps.forEach((entry) => {
      const housingLoad = entry.residents / Math.max(entry.capacities.housing, 1);
      const jobsLoad = entry.jobsFilled / Math.max(entry.capacities.jobs, 1);
      const localUtilityLoad = (
        (entry.residents * 0.22 + entry.jobsFilled * 0.08 + entry.capacities.powerDemandBase)
        / Math.max(entry.capacities.powerSupply + entry.capacities.waterSupply + 18, 1)
      ) * (2 - Math.min(powerCoverage, waterCoverage, 1.2));
      const localServicePressure = (
        (entry.residents * 0.2 + entry.jobsFilled * 0.08 + entry.capacities.serviceNeedBase)
        / Math.max(entry.capacities.serviceSupply + 12, 1)
      ) * (2 - Math.min(serviceCoverage, 1.15));
      const typeDemand =
        entry.district.type === 'residential' || entry.district.type === 'mixed'
          ? housingDemand / 10
          : entry.district.type === 'utility'
            ? utilitiesDemand / 10
            : entry.district.type === 'park'
              ? clamp((foodDemand - totals.foodProduction) / Math.max(foodDemand, 1) + servicesDemand / 16, 0, 1.4)
              : entry.district.type === 'civic'
                ? servicesDemand / 10
                : jobsDemand / 10;
      const localUnrest = clamp(
        state.city.resources.unrest * 0.46
          + Math.max(0, housingLoad - 0.92) * 34
          + Math.max(0, localUtilityLoad - 0.9) * 26
          + Math.max(0, localServicePressure - 1) * 24
          - entry.capacities.stability
          - entry.capacities.appeal * 12,
        2,
        100,
      );
      const growthTrend = clamp(
        typeDemand
          + (satisfaction - 50) / 50
          + (entry.capacities.appeal - 0.55)
          - Math.max(0, localUtilityLoad - 0.92) * 1.6
          - Math.max(0, localServicePressure - 1) * 1.3
          - localUnrest / 75,
        -3,
        3,
      );
      entry.localUnrest = localUnrest;
      entry.growthTrend = growthTrend;
      entry.utilityLoad = localUtilityLoad;
      entry.servicePressure = localServicePressure;
      entry.status =
        growthTrend > 1.2 ? 'Growing'
        : localUnrest > 62 ? 'Strained'
        : localUtilityLoad > 1.05 ? 'Utility strain'
        : localServicePressure > 1.02 ? 'Service pressure'
        : 'Stable';
    });

    return {
      season,
      districts: districtCaps,
      totals,
      demand: {
        housing: housingDemand,
        jobs: jobsDemand,
        utilities: utilitiesDemand,
        services: servicesDemand,
        transit: transitDemandScore,
      },
      housing: {
        capacity: totals.housing,
        shortage: housingShortage,
        pressure: housingShortage / Math.max(population, 1),
      },
      utilities: {
        power: { supply: totals.powerSupply, demand: powerDemand, coverage: powerCoverage },
        water: { supply: totals.waterSupply, demand: waterDemand, coverage: waterCoverage },
        transit: { supply: totals.transitSupply, demand: transitDemand, load: congestionRatio },
      },
      services: {
        supply: totals.serviceSupply,
        need: serviceNeed,
        coverage: serviceCoverage,
        pressure: Math.max(0, 1 - serviceCoverage),
      },
      economy: {
        jobsCapacity,
        laborPool,
        employed,
        employmentRate,
        production,
        revenue,
        upkeep,
        treasuryDelta,
      },
      food: {
        production: totals.foodProduction,
        demand: foodDemand,
        delta: foodDelta,
        reserveRatio: foodBufferRatio,
      },
      mood: {
        satisfaction,
        unrestTarget,
      },
      pressure: {
        growth: growthPressure,
        decline: declinePressure,
        utilityStrain: utilityCoverage < 0.95,
        housingShortage: housingShortage > 6,
        congestion: congestionRatio > 1.02,
        declinePressure: declinePressure > 3.7,
        growthPressure: growthPressure > 1.8,
      },
      summary: {
        activity: clamp(
          34 + state.sim.seasonProgress * 30 + production / 6 - state.city.resources.unrest / 5 + (state.sim.paused ? -14 : 10),
          12,
          98,
        ),
        alerts:
          Number(utilityCoverage < 0.95)
          + Number(housingShortage > 6)
          + Number(congestionRatio > 1.02)
          + Number(state.city.resources.unrest > 48),
      },
    };
  }

  function syncDistrictState(snapshot) {
    const state = getState();
    state.city.districts = state.city.districts.map((district) => {
      const next = snapshot.districts.find((entry) => entry.district.key === district.key);
      if (!next) return district;
      return {
        ...district,
        residents: next.residents,
        jobsFilled: next.jobsFilled,
        localUnrest: next.localUnrest,
        growthTrend: next.growthTrend,
        status: next.status,
        metrics: {
          housingCapacity: next.capacities.housing,
          jobsCapacity: next.capacities.jobs,
          powerSupply: next.capacities.powerSupply,
          waterSupply: next.capacities.waterSupply,
          serviceSupply: next.capacities.serviceSupply,
          production: next.capacities.production,
          revenueBase: next.capacities.revenueBase,
          utilityLoad: next.utilityLoad,
          servicePressure: next.servicePressure,
          appeal: next.capacities.appeal,
          stability: next.capacities.stability,
          pollution: next.capacities.pollution,
        },
      };
    });
  }

  function recomputeDerivedState() {
    const state = getState();
    const snapshot = calculateSnapshot();
    syncDistrictState(snapshot);

    state.city.systems = {
      season: currentSeason(),
      demand: snapshot.demand,
      housing: {
        ...snapshot.housing,
        pressurePercent: Math.round(snapshot.housing.pressure * 100),
      },
      utilities: {
        power: {
          ...snapshot.utilities.power,
          coveragePercent: Math.round(snapshot.utilities.power.coverage * 100),
        },
        water: {
          ...snapshot.utilities.water,
          coveragePercent: Math.round(snapshot.utilities.water.coverage * 100),
        },
        transit: {
          ...snapshot.utilities.transit,
          loadPercent: Math.round(snapshot.utilities.transit.load * 100),
        },
      },
      services: {
        ...snapshot.services,
        coveragePercent: Math.round(snapshot.services.coverage * 100),
      },
      economy: {
        ...snapshot.economy,
        employmentPercent: Math.round(snapshot.economy.employmentRate * 100),
      },
      food: snapshot.food,
      mood: {
        satisfaction: roundNumber(snapshot.mood.satisfaction),
        unrestTarget: roundNumber(snapshot.mood.unrestTarget),
      },
      pressure: snapshot.pressure,
      summary: snapshot.summary,
      overlays: [
        {
          key: 'growth',
          label: 'Growth',
          value: `${Math.round(clamp(50 + snapshot.pressure.growth * 8, 0, 100))}%`,
          tone: toneFromPercent(50 + snapshot.pressure.growth * 8),
        },
        {
          key: 'power',
          label: 'Power',
          value: `${Math.round(snapshot.utilities.power.coverage * 100)}%`,
          tone: toneFromRatio(snapshot.utilities.power.coverage),
        },
        {
          key: 'water',
          label: 'Water',
          value: `${Math.round(snapshot.utilities.water.coverage * 100)}%`,
          tone: toneFromRatio(snapshot.utilities.water.coverage),
        },
        {
          key: 'Unrest',
          label: 'Unrest',
          value: `${Math.round(state.city.resources.unrest)}%`,
          tone: state.city.resources.unrest < 28 ? 'good' : state.city.resources.unrest < 54 ? 'warn' : 'danger',
        },
      ],
    };
  }

  function normalizeState() {
    const state = getState();
    state.city.resources.population = Math.max(0, roundNumber(state.city.resources.population));
    state.city.resources.treasury = roundNumber(state.city.resources.treasury);
    state.city.resources.food = Math.max(0, roundNumber(state.city.resources.food));
    state.city.resources.unrest = clamp(roundNumber(state.city.resources.unrest), 0, 100);
    state.city.districts = state.city.districts.map((district) => ({
      ...district,
      development: clamp(roundNumber(district.development, 3), 0.22, 1.4),
      condition: clamp(roundNumber(district.condition, 3), 0.22, 1.2),
    }));
    state.city.assets = state.city.assets.map((asset) => ({
      ...asset,
      level: clamp(Math.round(asset.level), 1, asset.maxLevel),
    }));
    state.sim.speed = currentSpeedOption().value;
    state.sim.tick = Math.max(0, Math.round(state.sim.tick));
    state.sim.seasonLength = Math.max(1, Math.round(state.sim.seasonLength || TICKS_PER_SEASON));
    state.sim.seasonTick = clamp(Math.round(state.sim.seasonTick), 0, state.sim.seasonLength);
    state.sim.accumulatorMs = Math.max(0, state.sim.accumulatorMs || 0);
    state.sim.lastFrameMs = Math.max(0, state.sim.lastFrameMs || 0);
    state.sim.seasonProgress = clamp(state.sim.seasonTick / state.sim.seasonLength, 0, 1);
    state.ui.hoveredTarget = state.ui.hoveredTarget ?? null;
    recomputeDerivedState();

    if (!getDistrictByKey(state.ui.selection.key) && !getAssetByKey(state.ui.selection.key)) {
      state.ui.selection = { kind: 'district', key: 'civic' };
    }

    if (!state.gameOver && state.city.resources.population <= 0) {
      state.gameOver = true;
      state.sim.paused = true;
      logEvent('The city has emptied out. District systems fall silent without residents to sustain them.');
    } else if (!state.gameOver && state.city.resources.unrest >= 100) {
      state.gameOver = true;
      state.sim.paused = true;
      logEvent('Systemic strain breaks the charter. Stonehaven collapses into open revolt.');
    }
  }

  function selectedHousingAsset() {
    const options = ['north-terraces', 'south-crossings']
      .map((key) => getAssetByKey(key))
      .filter(Boolean)
      .filter((asset) => asset.level < asset.maxLevel)
      .map((asset) => {
        const district = getDistrictByKey(asset.districtKey);
        return {
          asset,
          score: (district?.growthTrend ?? 0) - (district?.localUnrest ?? 0) * 0.01 + asset.level * -0.1,
        };
      })
      .sort((left, right) => right.score - left.score);

    return options[0]?.asset ?? null;
  }

  function selectedAssetForAction(actionKey) {
    const state = getState();

    if (state.ui.selection.kind === 'asset') {
      const asset = getAssetByKey(state.ui.selection.key);
      const matchesAction =
        (actionKey === 'housing' && ['north-terraces', 'south-crossings'].includes(asset?.key))
        || (actionKey === 'grid' && asset?.key === 'harbor-grid')
        || (actionKey === 'industry' && asset?.key === 'industry-foundry')
        || (actionKey === 'services' && asset?.key === 'civic-hall');
      if (asset && matchesAction && asset.level < asset.maxLevel) {
        return asset;
      }
    }

    if (state.ui.selection.kind === 'district') {
      const district = getDistrictByKey(state.ui.selection.key);
      const preferredKey =
        actionKey === 'housing' && district?.type === 'residential' ? 'north-terraces'
        : actionKey === 'housing' && district?.type === 'mixed' ? 'south-crossings'
        : actionKey === 'grid' && district?.key === 'harbor' ? 'harbor-grid'
        : actionKey === 'industry' && district?.key === 'industry' ? 'industry-foundry'
        : actionKey === 'services' && district?.key === 'civic' ? 'civic-hall'
        : null;
      const asset = preferredKey ? getAssetByKey(preferredKey) : null;
      if (asset && asset.level < asset.maxLevel) {
        return asset;
      }
    }

    return null;
  }

  function upgradeAsset(assetKey, cost) {
    const state = getState();
    const asset = getAssetByKey(assetKey);
    if (!asset || asset.level >= asset.maxLevel) return false;
    if (state.city.resources.treasury < cost) return false;
    state.city.resources.treasury -= cost;
    asset.level += 1;
    return true;
  }

  function applyAction(type) {
    const state = getState();
    if (state.gameOver || state.actionsLeft <= 0) return false;

    let applied = false;
    if (type === 'housing') {
      const asset = selectedAssetForAction(type) ?? selectedHousingAsset();
      if (asset) {
        const cost = 22 + asset.level * 6;
        applied = upgradeAsset(asset.key, cost);
        if (applied) {
          logEvent(`${asset.label} expands in ${getDistrictByKey(asset.districtKey)?.label}. More housing comes online, but service demand rises too.`);
        }
      }
    }

    if (type === 'grid') {
      const asset = selectedAssetForAction(type) ?? getAssetByKey('harbor-grid');
      if (asset) {
        const cost = 24 + asset.level * 8;
        applied = upgradeAsset(asset.key, cost);
        if (applied) {
          state.city.resources.unrest = Math.max(0, state.city.resources.unrest - 3);
          logEvent('Rivergate hardens the utility grid. Power and water margins improve immediately.');
        }
      }
    }

    if (type === 'industry') {
      const asset = selectedAssetForAction(type) ?? getAssetByKey('industry-foundry');
      if (asset) {
        const cost = 20 + asset.level * 8;
        applied = upgradeAsset(asset.key, cost);
        if (applied) {
          state.city.resources.unrest += 2;
          logEvent('Ironworks receives fresh capital. Output and jobs rise, but district pressure sharpens.');
        }
      }
    }

    if (type === 'services') {
      const asset = selectedAssetForAction(type) ?? getAssetByKey('civic-hall');
      if (asset) {
        const cost = 18 + asset.level * 7;
        applied = upgradeAsset(asset.key, cost);
        if (applied) {
          state.city.resources.unrest = Math.max(0, state.city.resources.unrest - 7);
          state.city.resources.population += 1.2;
          logEvent('Civic services deepen. Satisfaction rebounds and a few new households decide to stay.');
        }
      }
    }

    if (!applied) return false;

    state.actionsLeft -= 1;
    normalizeState();
    store.notify('app');
    return true;
  }

  function syncAlerts() {
    const state = getState();
    const nextAlerts = state.city.systems.pressure;
    const previous = state.city.alerts;
    const districtUnderMostPressure = [...state.city.districts].sort((left, right) => {
      const leftRisk = left.localUnrest + left.metrics.utilityLoad * 30 + left.metrics.servicePressure * 24;
      const rightRisk = right.localUnrest + right.metrics.utilityLoad * 30 + right.metrics.servicePressure * 24;
      return rightRisk - leftRisk;
    })[0];
    const districtWithGrowth = [...state.city.districts].sort((left, right) => right.growthTrend - left.growthTrend)[0];

    if (nextAlerts.utilityStrain && !previous.utilityStrain) {
      logEvent('Utility strain spreads through the grid. District activity starts throttling under constrained supply.');
    }
    if (nextAlerts.housingShortage && !previous.housingShortage) {
      logEvent('Housing demand outruns capacity. Overcrowding begins pushing up local tension.');
    }
    if (nextAlerts.congestion && !previous.congestion) {
      logEvent('Congestion forms along the main corridors. Movement inefficiency starts dragging on production.');
    }
    if (nextAlerts.declinePressure && !previous.declinePressure && districtUnderMostPressure) {
      logEvent(`${districtUnderMostPressure.label} starts to slip under compound pressure from utilities, services, and unrest.`);
    }
    if (nextAlerts.growthPressure && !previous.growthPressure && districtWithGrowth) {
      logEvent(`${districtWithGrowth.label} picks up development momentum as the city leans into new demand.`);
    }

    state.city.alerts = {
      utilityStrain: nextAlerts.utilityStrain,
      housingShortage: nextAlerts.housingShortage,
      congestion: nextAlerts.congestion,
      declinePressure: nextAlerts.declinePressure,
      growthPressure: nextAlerts.growthPressure,
    };
  }

  function tickCity() {
    const state = getState();
    if (state.gameOver) return false;

    const systems = state.city.systems;
    const growthSignal =
      (systems.mood.satisfaction - 54) / 24
      + systems.pressure.growth * 0.32
      - systems.pressure.decline * 0.24
      - state.city.resources.unrest / 70;
    const populationDelta = clamp(growthSignal, -3.2, 2.8);
    const unrestDelta = clamp((systems.mood.unrestTarget - state.city.resources.unrest) * 0.18, -4.2, 5.4);
    const foodDelta = systems.food.delta;
    const treasuryDelta = systems.economy.treasuryDelta;

    state.city.resources.population += populationDelta;
    state.city.resources.food += foodDelta;
    state.city.resources.treasury += treasuryDelta;
    state.city.resources.unrest += unrestDelta;

    if (state.city.resources.food <= 0 && foodDelta < 0) {
      const shortage = Math.abs(state.city.resources.food);
      state.city.resources.food = 0;
      state.city.resources.population -= clamp(shortage * 0.5, 0.4, 3.2);
      state.city.resources.unrest += 4 + shortage * 0.6;
    }

    if (state.city.resources.treasury < -45) {
      state.city.resources.unrest += 1.4;
    }

    state.city.districts.forEach((district) => {
      const districtUtilityPenalty = Math.max(0, district.metrics.utilityLoad - 0.95);
      const districtServicePenalty = Math.max(0, district.metrics.servicePressure - 1);
      const developmentDelta = clamp(
        district.growthTrend * 0.014 - districtUtilityPenalty * 0.012 - district.localUnrest / 500,
        -0.026,
        0.028,
      );
      const conditionDelta = clamp(
        ((1.02 - districtUtilityPenalty - districtServicePenalty) - district.localUnrest / 100) * 0.01,
        -0.018,
        0.018,
      );
      district.development += developmentDelta;
      district.condition += conditionDelta;
    });

    state.sim.tick += 1;
    state.sim.seasonTick += 1;
    normalizeState();
    syncAlerts();

    if (state.sim.seasonTick >= state.sim.seasonLength) {
      advanceSeason();
      return true;
    }

    store.notify('app');
    return true;
  }

  function seasonSummary() {
    const state = getState();
    const systems = state.city.systems;
    return `${currentSeason()} closes with ${Math.round(systems.economy.production)} output, ${Math.round(systems.food.production)} food, utility coverage at ${Math.round(Math.min(systems.utilities.power.coverage, systems.utilities.water.coverage) * 100)}%, and satisfaction at ${Math.round(systems.mood.satisfaction)}%.`;
  }

  function advanceSeason() {
    const state = getState();
    if (state.gameOver) return false;

    logEvent(seasonSummary());
    state.turn += 1;
    state.actionsLeft = ACTION_LIMIT;
    state.seasonIndex += 1;
    state.sim.seasonTick = 0;
    state.sim.seasonProgress = 0;

    if (state.seasonIndex >= SEASONS.length) {
      state.seasonIndex = 0;
      state.year += 1;
      state.city.resources.treasury += 10;
      logEvent('A new year starts. Contract renewals add a modest treasury cushion for the next cycle.');
    } else {
      logEvent(`${currentSeason()} begins. Baseline pressures shift with the new weather.`);
    }

    normalizeState();
    syncAlerts();
    store.notify('app');
    return true;
  }

  function togglePause(forceValue) {
    const state = getState();
    state.sim.paused = typeof forceValue === 'boolean' ? forceValue : !state.sim.paused;
    state.sim.lastFrameMs = 0;
    store.notify('app');
    return state.sim.paused;
  }

  function setSpeed(speed) {
    if (!SPEED_OPTIONS.some((option) => option.value === speed)) return false;
    const state = getState();
    state.sim.speed = speed;
    state.sim.accumulatorMs = 0;
    state.sim.lastFrameMs = 0;
    store.notify('app');
    return true;
  }

  function rushSeason() {
    const state = getState();
    if (state.gameOver) return false;
    const seasonTurn = state.turn;
    while (!getState().gameOver && getState().turn === seasonTurn) {
      tickCity();
    }
    return true;
  }

  function assetActionKey(asset) {
    if (!asset) return null;
    if (['north-terraces', 'south-crossings'].includes(asset.key)) return 'housing';
    if (asset.key === 'harbor-grid') return 'grid';
    if (asset.key === 'industry-foundry') return 'industry';
    if (asset.key === 'civic-hall') return 'services';
    return null;
  }

  function actionLabel(key) {
    return ACTIONS.find((action) => action.key === key)?.label ?? key;
  }

  function selectedEntity() {
    const state = getState();
    if (state.ui.selection.kind === 'asset') {
      const asset = getAssetByKey(state.ui.selection.key);
      const district = asset ? getDistrictByKey(asset.districtKey) : null;
      return { kind: 'asset', asset, district };
    }

    const district = getDistrictByKey(state.ui.selection.key);
    return { kind: 'district', district, asset: null };
  }

  function applyExternalState(nextState) {
    store.setState(mergeState(getState(), nextState), { notify: false });
    normalizeState();
    store.notify('app');
  }

  function resetGame() {
    store.reset({ notify: false });
    normalizeState();
    syncAlerts();
    store.notify('app');
  }

  function initialize() {
    normalizeState();
    syncAlerts();
  }

  return {
    actionLabel,
    applyAction,
    applyExternalState,
    assetActionKey,
    clearHoveredTarget,
    currentSeason,
    currentSpeedOption,
    currentTickMs,
    getAssetByKey,
    getDistrictByKey,
    initialize,
    nextSeason,
    resolveAssetEffects,
    resetGame,
    rushSeason,
    selectAsset,
    selectDistrict,
    selectedAssetForAction,
    selectedEntity,
    setHoveredTarget,
    setSpeed,
    tickCity,
    togglePause,
  };
}
