import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {tick} from '../../src/simulation/game.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {RouteSectorIndex} from './prototype_route_sector_index.mjs';

const binary=process.env.SECTOR_TRACE_WASM;if(!binary)throw Error('Set SECTOR_TRACE_WASM');
const module=new WebAssembly.Module(fs.readFileSync(binary));
const source=gunzipSync(fs.readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString();
function run(audit){
 const game=deserialize(source),loaded=new Map(),session=createSpatialGameSession(module,game,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)}),raw=session.core.wasm,records=[];
 let armed=false;
 try{
  for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  // Replace only the exposed diagnostic entry point. Core navigation retains
  // the original WASM exports, and the native reconciliation always runs.
  if(audit)session.core.wasm={...raw,nav_intent_reconcile_topology(){
   if(!armed)return raw.nav_intent_reconcile_topology();
   const originalProfile=raw.lazy_selected_context(),indices=new Map(),actors=[];
   for(const [worker,list] of [[true,game.workers],[false,game.raid?.animals??[]]])for(const actor of list){
    const match=String(actor.id).match(/(\d+)$/);if(!match||raw.nav_intent_actor(Number(match[1]))!==1)continue;
    const row=Array.from(new Float64Array(raw.memory.buffer,raw.nav_intent_actor_ptr(),10));if(row[1]!==1)continue;
    const count=raw.nav_intent_route_points(row[4],row[5],row[6]);if(count<0)throw Error('Live route handle disappeared');
    const native=Array.from(new Float32Array(raw.memory.buffer,raw.nav_intent_route_ptr(row[4],row[5],row[6]),count*2));
    const path=actor.path,verified=Array.isArray(path)&&path.length<=count&&path.every((p,i)=>Math.fround(p.x)===native[(count-path.length+i)*2]&&Math.fround(p.z)===native[(count-path.length+i)*2+1])&&(path.length>0||Math.hypot(actor.x-native.at(-2),actor.z-native.at(-1))<=.1);
    session.actorSectorRevision({worker,species:actor.species});const profile=raw.lazy_selected_context();let index=indices.get(profile);if(!index)indices.set(profile,index=new RouteSectorIndex(12));
    index.set(row[0],actor,path,actor.radius??.28,{verified});actors.push({id:row[0],verified,profile});
   }
   raw.spatial_select_nav_profile_index(originalProfile);
   const count=raw.lazy_sector_change_trace_count(),data=Array.from(new Int32Array(raw.memory.buffer,raw.lazy_sector_change_trace_ptr(),count*4)),events=[];
   for(let i=0;i<data.length;i+=4)events.push({profile:data[i],kind:data[i+1],x:data[i+2],z:data[i+3]});
   const candidates=new Set();for(const [profile,index] of indices){const relevant=events.filter(e=>e.profile===profile);for(const id of index.affected({complete:!relevant.some(e=>e.kind===0),sectors:relevant.filter(e=>e.kind!==0)}))candidates.add(id);}
   const before=raw.nav_intent_change_count(),invalidated=raw.nav_intent_reconcile_topology(),after=raw.nav_intent_change_count();
   const changes=Array.from(new Float64Array(raw.memory.buffer,raw.nav_intent_change_ptr(),after*8));
   const invalidIds=[];for(let i=before;i<after;i++)if(changes[i*8+1]===0)invalidIds.push(changes[i*8]);
   const untrackedInvalidIds=invalidIds.filter(id=>!actors.some(a=>a.id===id));
   const missed=invalidIds.filter(id=>actors.some(a=>a.id===id)&&!candidates.has(id));
   records.push({actors:actors.length,unverified:actors.filter(a=>!a.verified).length,events:events.length,globalEvents:events.filter(e=>e.kind===0).length,candidates:candidates.size,invalidated,invalidIds,untrackedInvalidIds,missed});
   raw.lazy_sector_change_trace_clear();return invalidated;
  }};
  const planner=createEventDrivenTaskPlanner(session),restored=planner.resetFromState(game),nav=createSpatialNavigationMovement(session,game),stopTasks=planner.observeTasks(game),stopWorld=planner.observeWorld(game);nav.intentTaskPlanner=planner;
  try{
   for(let step=0;step<10;step++){tick(game,.1,nav);nav.serviceRaidConnectivityDemand?.();}
   const animal=game.raid?.animals.find(a=>a.path?.length>30);if(!animal)throw Error('No long active raid route');
   const point=animal.path[Math.floor(animal.path.length/2)];raw.lazy_sector_change_trace_clear();armed=true;
   if(session.core.addWall(point.x,point.z,.3,.3)<=0)throw Error('Wall creation failed');
   const targets=game.raid.animals.map(a=>({id:a.id,kind:game.plants.some(p=>p.id===a.targetId)?'crop':game.structures.some(s=>s.id===a.targetId)?'structure':'other'}));
   const invalidated=planner.reconcileNavigationRevision(game,nav.version+1);planner.reconcileWorkerRoutes(game,{navVersion:nav.version+1});armed=false;
   for(let step=0;step<20;step++){tick(game,.1,nav);nav.serviceRaidConnectivityDemand?.();}
   return {state:serialize(game),restored,invalidated,records,animalId:animal.id,point,targets};
  }finally{stopTasks();stopWorld();}
 }finally{session.dispose();}
}
const reference=run(false),candidate=run(true);
if(reference.state!==candidate.state)throw Error('Shadow audit changed deterministic confirmed state');
if(!candidate.records.length||candidate.records.some(row=>row.missed.length||row.untrackedInvalidIds.length))throw Error('Shadow audit missed or did not track a route invalidation');
const result={scope:'One saved eight-animal raid advanced ten ticks; controlled barrier placed on an existing route, followed by twenty more ticks. Shadow diagnostics only; no timings or GPU.',stateEqual:true,restored:candidate.restored.restoredAnimalRoutes,animalId:candidate.animalId,point:candidate.point,targets:candidate.targets,invalidated:candidate.invalidated,records:candidate.records};
console.log(JSON.stringify(result,null,2));if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(result,null,2)+'\n');
