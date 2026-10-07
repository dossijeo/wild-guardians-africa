export const DESTRUCTION_SOUND_ROUTES=Object.freeze({debrisEmitted:'wall_debris_small',groundContacts:'wall_debris_ground'});

// One cue per observed batch, never one source per particle. The short deadline
// prevents a first decode from sounding after the matching visual has passed.
export function destructionSounds(counts){
 return Object.entries(DESTRUCTION_SOUND_ROUTES).filter(([key])=>counts?.[key]>0).map(([,id])=>id);
}
