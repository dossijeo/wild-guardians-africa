// Bound retained commands while the authority or presentation channel is stalled.
// This is a memory safety limit, not a frame or simulation time budget.
export const MAX_PENDING_PRESENTATION_INPUTS=256;
