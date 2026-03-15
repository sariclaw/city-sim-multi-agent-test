export function getPolicyModifiers(state) {
  const policies = state.city.policies;

  return {
    foodUseMultiplier: policies.rationing ? 0.82 : 1,
    discontentFlat:
      (policies.rationing ? 4 : 0)
      + (policies.emergency_shift ? 7 : 0)
      + (policies.curfew ? -4 : 0),
    hopeFlat:
      (policies.heating_subsidy ? 3 : 0)
      + (policies.work_safety ? 2 : 0)
      + (policies.curfew ? -3 : 0)
      + (policies.emergency_shift ? -5 : 0),
    productionMultiplier:
      1
      + (policies.emergency_shift ? 0.18 : 0)
      - (policies.work_safety ? 0.05 : 0),
    sicknessMultiplier:
      1
      - (policies.work_safety ? 0.14 : 0)
      + (policies.emergency_shift ? 0.12 : 0),
    heatRelief: policies.heating_subsidy ? 0.18 : 0,
    trafficMultiplier: policies.curfew ? 0.82 : 1,
    treasuryCostPerTick: policies.heating_subsidy ? 4 : 0,
  };
}
