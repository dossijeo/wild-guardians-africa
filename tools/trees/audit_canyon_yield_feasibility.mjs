import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../../src/persistence/snapshots.js';
import {targetFor} from '../../src/simulation/raids.js';
import {actorBlockers,actorSegmentClear} from '../../src/simulation/actor-motion.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';

const input=process.env.NO_PHASE_SELECTION;if(!input)throw Error('Set NO_PHASE_SELECTION');
const text=gunzipSync(fs.readFileSync(input)).toString(),module=new WebAssembly.Module(fs.readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
function run(candidate=null){
 const state=deserialize(text),loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)});
 try{
  const animals=state.raid.animals,points=[...animals.flatMap(a=>[a,a.spawn,a.exit]),...state.structures],bounds=[Math.min(...points.map(p=>p.x))-64,Math.min(...points.map(p=>p.z))-64,Math.max(...points.map(p=>p.x))+64,Math.max(...points.map(p=>p.z))+64];
  for(let z=Math.floor((bounds[1]+24)/48);z<=Math.floor((bounds[3]+24)/48);z++)for(let x=Math.floor((bounds[0]+24)/48);x<=Math.floor((bounds[2]+24)/48);x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  const nav=createSpatialNavigationMovement(session,state);nav.setActiveBounds(bounds);const chooser=animals.find(a=>a.id==='animal-3060'),mover=animals.find(a=>a.id==='animal-3055'),start={x:mover.x,z:mover.z},blockers=actorBlockers(state,mover,false);
  const select=()=>targetFor(state,chooser,nav)?.target?.id??null;
  const initial=select();if(initial!=='plant-2509')throw Error(`Selection replay changed: ${initial}`);
  const attempts=[],distances=candidate?[candidate.distance]:[.1,.2,.3,.38,.5,.75,1,1.5,2],angles=candidate?[candidate.angle]:Array.from({length:16},(_,i)=>i*Math.PI/8);
  for(const distance of distances)for(const angle of angles){
   const point={x:start.x+Math.cos(angle)*distance,z:start.z+Math.sin(angle)*distance};
   const staticClear=nav.segmentClear(start,point,mover.radius,null,false),bodyClear=actorSegmentClear(start,point,mover,blockers);
   let target=null;if(staticClear&&bodyClear){mover.x=point.x;mover.z=point.z;target=select();mover.x=start.x;mover.z=start.z;}
   attempts.push({distance,angle,point,staticClear,bodyClear,target});
  }
  const final=select();if(final!==initial)throw Error('Repeated selection changed after restoring actor position');
  return {initial,attempts};
 }finally{session.dispose();}
}
const first=run(),matching=first.attempts.filter(a=>a.target==='plant-2898'),verify=matching.length?run(matching[0]):null;
if(verify&&verify.attempts[0].target!=='plant-2898')throw Error('Candidate did not reproduce in a fresh session');
const output={scope:'Counterfactual positions sampled around one body at a saved selection boundary. A tested segment is clear against the captured body positions and static terrain; this is not proof of a feasible joint trajectory, simulation parity or performance.',tested:first.attempts.length,clear:first.attempts.filter(a=>a.staticClear&&a.bodyClear).length,matching:matching.length,matchingWithin038:matching.filter(a=>a.distance<=.38).length,freshSessionVerified:!!verify,attempts:first.attempts};
console.log(JSON.stringify(output,null,2));if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(output,null,2)+'\n');
