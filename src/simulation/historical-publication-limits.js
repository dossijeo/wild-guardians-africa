// This is a causal input/body-handoff horizon, not a CPU or frame budget.
export const HISTORICAL_MAX_REAL_DURATION = .1;

// Apply only after the host has validated the recoverable historical profile.
// Keep every already accepted step; limit only how many one publication covers.
export function historicalPublicationRuntimeOptions(options, enabled) {
 if (!enabled) return options;
 const step = options.stepSeconds ?? .05;
 const batch = options.maxBatchSteps ?? 1;
 const window = options.batchWindowSteps ?? 1;
 if (!Number.isFinite(step) || step <= 0 || step > HISTORICAL_MAX_REAL_DURATION ||
     !Number.isSafeInteger(batch) || batch < 1 || batch > 256 ||
     !Number.isSafeInteger(window) || window < 1 || window > batch ||
     window > 1 && window * step > .25) throw TypeError('Invalid historical publication horizon');
 const maxSteps = Math.floor((HISTORICAL_MAX_REAL_DURATION + 1e-12) / step);
 const maxBatchSteps = Math.min(batch, maxSteps);
 return {...options, maxBatchSteps, batchWindowSteps: Math.min(window, maxBatchSteps)};
}
