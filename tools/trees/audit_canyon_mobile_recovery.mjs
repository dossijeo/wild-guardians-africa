import fs from 'node:fs';
import {createHash} from 'node:crypto';
import {gzipSync} from 'node:zlib';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {observeGameEvents} from '../../src/simulation/game.js';
import {updateRaid} from '../../src/simulation/raids.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';

const state=deserialize(fs.readFileSync('docs/qa/hierarchical-navigation/spatial-virtual-gran-canon-14-farm-bank-seed123-state.json','utf8'));
const module=new WebAssembly.Module(fs.readFileSync('src/world/wild-engine/spatial-savanna.wasm')),animals=state.raid.animals,loaded=new Map(),session=createSpatialGameSession(module,state,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)});
try{
 const points=[...animals.flatMap(a=>[a,a.spawn,a.exit]),...state.structures],bounds=[Math.min(...points.map(p=>p.x))-64,Math.min(...points.map(p=>p.z))-64,Math.max(...points.map(p=>p.x))+64,Math.max(...points.map(p=>p.z))+64];
 for(let z=Math.floor((bounds[1]+24)/48);z<=Math.floor((bounds[3]+24)/48);z++)for(let x=Math.floor((bounds[0]+24)/48);x<=Math.floor((bounds[2]+24)/48);x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);session.core.selectChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
 const nav=createSpatialNavigationMovement(session,state);nav.setActiveBounds(bounds);const recoveries=[],samples=[],pairs=new Set(),eventCounts={},importantEvents=[],eventTrace=[],transitions=[],frames=[],lastState=new Map(),durations=[];let overlapSamples=0,phasedSamples=0,maxPenetration=0,elapsed=0,steps=0,staticViolations=0;
 const stop=observeGameEvents(state,event=>{eventCounts[event.type]=(eventCounts[event.type]??0)+1;const row={type:event.type,targetId:event.targetId??null,actorId:event.actorId??null,species:event.species??null,reason:event.reason??null};if(['AnimalLogicalHit','AnimalLogicalMiss','AnimalRetreatExitAbandoned','RaidEnded'].includes(event.type))importantEvents.push(row);if(process.env.TRACE_TRAFFIC==='1')eventTrace.push({step:steps,time:state.elapsed,...row});});
 nav.motionObserver=event=>recoveries.push({...event});
 let selectionCaptured=false;
 if(process.env.CAPTURE_SELECTION)nav.planningObserver=event=>{
  if(selectionCaptured||event.kind!=='attackSelection'||event.actorId!==process.env.CAPTURE_SELECTION)return;
  if(!process.env.SELECTION_OUTPUT)throw Error('Set SELECTION_OUTPUT for selection capture');
  const snapshot=serialize(state);fs.writeFileSync(process.env.SELECTION_OUTPUT,process.env.SELECTION_OUTPUT.endsWith('.gz')?gzipSync(snapshot):snapshot);selectionCaptured=true;
 };
 const radius=a=>a.radius??.28;
 const observe=(a,b,kind)=>{
  const depth=radius(a)+radius(b)-Math.hypot(a.x-b.x,a.z-b.z);if(depth<=1e-7)return;
  overlapSamples++;maxPenetration=Math.max(maxPenetration,depth);const phased=(a.mobilePhaseRemaining??0)>0||(b.mobilePhaseRemaining??0)>0;if(phased)phasedSamples++;
  pairs.add([a.id,b.id].sort().join('|'));
  if(samples.length<20)samples.push({step:steps,time:elapsed,kind,a:a.id,b:b.id,depth,phased,aStatus:a.status,bStatus:b.status});
 };
 const scan=()=>{
  for(let i=0;i<animals.length;i++){
   const animal=animals[i];if(animal.status==='gone')continue;
   for(let j=i+1;j<animals.length;j++)if(animals[j].status!=='gone')observe(animal,animals[j],'animal-animal');
   for(const worker of state.workers)if(worker.status!=='home'&&(worker.incapacitated||animal.status==='retreating'||animal.hitsRemaining<=0))observe(animal,worker,'animal-worker');
  }
 };
 scan();const initialOverlapSamples=overlapSamples;
 for(;elapsed<180&&state.raid;elapsed+=.1){const before=animals.map(a=>({x:a.x,z:a.z}));state.elapsed+=.1;const started=performance.now();updateRaid(state,.1,nav);durations.push(performance.now()-started);steps++;for(let i=0;i<animals.length;i++){const animal=animals[i];if(Math.hypot(animal.x-before[i].x,animal.z-before[i].z)>1e-8&&!nav.segmentClear(before[i],animal,animal.radius,null,false))staticViolations++;if(process.env.TRACE_TRAFFIC==='1'){const row={status:animal.status,target:animal.targetId??null,hits:animal.hitsRemaining};if(JSON.stringify(row)!==lastState.get(animal.id)){transitions.push({step:steps,actor:animal.id,...row,x:animal.x,z:animal.z});lastState.set(animal.id,JSON.stringify(row));}}}if(process.env.TRACE_TRAFFIC==='1'&&steps<=5)frames.push({step:steps,actors:animals.map(a=>({id:a.id,x:a.x,z:a.z,radius:a.radius,status:a.status,target:a.targetId??null,phase:a.mobilePhaseRemaining??0,next:a.path?.[0]??null}))});scan();}
 stop();durations.sort((a,b)=>a-b);const percentile=p=>durations[Math.min(durations.length-1,Math.floor(durations.length*p))];
 const result={scope:'Saved canyon raid using production WASM; discrete end-of-tick body overlaps under current participation rules, not continuous swept-collision proof. Timings measure instrumented updateRaid only in Node, excluding rendering, GPU, collision audit and setup.',phaseDisabled:process.env.MOBILE_PHASE_EXPERIMENT==='1',authority:'spatial-wasm',intentPlanner:!!nav.intentTaskPlanner,steps,completed:!state.raid,animals:animals.length,initialOverlapSamples,overlapSamples,phasedSamples,distinctPairs:pairs.size,maxPenetration,staticViolations,recoveries:recoveries.length,recoveryExamples:recoveries.slice(0,12),eventCounts,importantEvents,...(process.env.TRACE_TRAFFIC==='1'?{eventTrace,transitions,frames}:{}),stateHash:createHash('sha256').update(serialize(state)).digest('hex'),cpu:{mean:durations.reduce((a,b)=>a+b,0)/durations.length,p95:percentile(.95),p99:percentile(.99),max:durations.at(-1)},samples};
 console.log(JSON.stringify(result,null,2));if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');
}finally{session.dispose();}
