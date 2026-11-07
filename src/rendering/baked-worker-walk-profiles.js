// Only profiles with an authored bake and a validated source rig belong here.
export const BAKED_WORKER_WALK_PROFILES=Object.freeze(['youngMale','olderMale','olderFemale','youngFemale']);
export const hasBakedWorkerWalk=profile=>BAKED_WORKER_WALK_PROFILES.includes(profile);
