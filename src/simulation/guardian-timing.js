// Simulation-time presentation markers. Commands still spend cooldown and
// interrupt the target immediately; the short flight only delays presentation.
export const GUARDIAN_ATTACK_TIMING=Object.freeze({release:.14,impact:.24,afterglow:.28});
export const guardianImpactTime=hit=>hit?.impactAt??hit?.at;
