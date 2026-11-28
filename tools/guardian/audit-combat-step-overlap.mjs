import {readFileSync} from 'node:fs';
import assert from 'node:assert/strict';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {createSimulationAuthority} from '../../src/simulation/simulation-authority.js';
import {confirmedHistoricalAttackPlans} from '../../src/rendering/attack-vfx.js';
import {createLocomotionStepTracker} from '../../src/rendering/locomotion-contact.js';

// Read-only diagnostic: replay the unchanged saved scenario through the real
// authority. Requested chunks bound possible visible ground, not its actual
// GPU residency. This is not a frame-time or visual-equivalence benchmark.
const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
const fixture='tests/fixtures/sabana712-d6-native-multi-reservation.json.gz';
const snapshot=serialize(deserialize(gunzipSync(readFileSync(fixture)).toString())),keys=[];
for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++)keys.push(`${x},${z}`);
const keySet=new Set(keys),authority=createSimulationAuthority(module,snapshot,keys,{observeWorldMotion:true}),tracker=createLocomotionStepTracker(),steps=new Map();
let state=JSON.parse(authority.execute({kind:'snapshot',sequence:1}).snapshot);
const counts={fixture,biome:state.biome,ticks:0,combatPlan:0,combatWithSteps:0,stepTicks:0,markers:0,markersInRequestedChunks:0,forecastValid:0,forecastContacts:0};const headingFor=actor=>actor.profile&&actor.path?.length?Math.atan2(actor.path[0].x-actor.x,actor.path[0].z-actor.z):actor.heading??0;tracker.observe(state,headingFor);
try{
 for(let sequence=2;sequence<=451;sequence++){
  const publication=authority.execute({kind:'advance',sequence,seconds:.05,steps:1,nightFastForward:false,captureClockSegments:true}),next=JSON.parse(publication.snapshot),preview={start:state.elapsed,end:next.elapsed,clockSegments:publication.clockSegments,trace:publication.worldMotionTrace},combat=confirmedHistoricalAttackPlans(state,preview);
  counts.ticks++;counts.combatPlan+=+(!!combat?.length);counts.combatWithSteps+=+(!!combat?.length&&steps.size>0);counts.stepTicks+=+(steps.size>0);
  const forecast=tracker.preview(state,preview,{headingAtEnd:(actor,last)=>actor.profile&&last.pathActive?last.yaw:last.heading??0});Object.assign(state,next);const arrivals=tracker.observe(state,headingFor);if(forecast!==null){assert.deepEqual(forecast,arrivals);counts.forecastValid++;counts.forecastContacts+=forecast.length;}counts.markers+=arrivals.length;
  for(const step of arrivals){const key=`${Math.floor((step.x+24)/48)},${Math.floor((step.z+24)/48)}`;if(keySet.has(key)){steps.set(step.key,step);counts.markersInRequestedChunks++;}}
  for(const [key,step] of steps)if(state.elapsed-step.birth>=1.6||state.elapsed-step.birth<0)steps.delete(key);
 }
 console.log(JSON.stringify(counts,null,2));
}finally{authority.dispose();}
