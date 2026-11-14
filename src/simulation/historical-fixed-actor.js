// A body which never moves cannot cross a static obstacle during this
// interval, including when the authority already starts it overlapping one.
// This says nothing about bone geometry, other actors or moving gates.
export function historicalFixedActor(actor,ticks,start,end){
 if(!actor||actor.continuous!==true||actor.timed!==true||actor.start?.at!==start||actor.end?.at!==end||![actor.start.x,actor.start.z,actor.end.x,actor.end.z].every(Number.isFinite)||actor.start.x!==actor.end.x||actor.start.z!==actor.end.z||!Array.isArray(actor.segments)||actor.segments.some(s=>s.x0!==actor.start.x||s.x1!==actor.start.x||s.z0!==actor.start.z||s.z1!==actor.start.z)||ticks?.complete!==true||!Array.isArray(ticks.actors))return false;
 const matches=ticks.actors.filter(value=>value.actorId===actor.actorId);if(matches.length!==1)return false;const samples=matches[0].samples;if(!Array.isArray(samples)||samples.length<2||samples[0].at!==start||samples.at(-1).at!==end)return false;return samples.every((sample,index)=>Number.isFinite(sample?.at)&&(!index||sample.at>samples[index-1].at)&&sample.x===actor.start.x&&sample.z===actor.start.z);
}
