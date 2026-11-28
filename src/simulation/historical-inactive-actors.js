// The normal body projection excludes workers at home and animals gone from
// the world. Exclude them from historical geometry checks only when the whole
// recorded interval proves that they stayed absent. They remain in the roster.
export function historicalInactiveActor(actor, ticks, start, end) {
 if (!actor || !['home','gone'].includes(actor.startStatus) || actor.endStatus !== actor.startStatus ||
     actor.continuous !== true || actor.timed !== true || actor.segments?.length !== 0 ||
     actor.start?.at !== start || actor.end?.at !== end || ![start,end,actor.start.x,actor.start.z,actor.end.x,actor.end.z].every(Number.isFinite) || actor.start.x !== actor.end.x || actor.start.z !== actor.end.z ||
     !ticks?.complete || !Array.isArray(ticks.actors)) return false;
 const records = ticks.actors.filter(entry => entry.actorId === actor.actorId);
 if (records.length !== 1) return false;
 const samples = records[0].samples;
 return Array.isArray(samples) && samples.length >= 2 && samples[0].at === start && samples.at(-1).at === end &&
  samples.every((sample, i) => Number.isFinite(sample.at) && (!i || sample.at > samples[i-1].at) &&
   sample.status === actor.startStatus && sample.x === actor.start.x && sample.z === actor.start.z &&
   !sample.falling && !sample.recovery && !sample.incapacitated);
}
