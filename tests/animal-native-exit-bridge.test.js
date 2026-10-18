import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/wild-engine/spatial-navigation-movement.js';
import {animalNativeExitBridge} from '../src/simulation/animal-native-exit-bridge.js';
import {walkTo} from '../src/simulation/game.js';

test('a native exit bridge joins a physical fractional pocket to the shared route',()=>{
 const raw=readFileSync(new URL('./fixtures/manglares-123-day17-retreat.json.gz',import.meta.url));
 const capture=JSON.parse(gunzipSync(raw)),state=deserialize(JSON.stringify(capture.state));
 const actor=state.raid.animals.find(a=>a.id===capture.actorId);
 assert.equal(actor.status,'retreating');assert.equal(actor.hitsRemaining,3);
 assert.equal(actor.exitConnectorSearch.exhausted,true);
 const wasm=new WebAssembly.Module(readFileSync(new URL(
  '../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
 const loaded=new Map(),session=createSpatialGameSession(wasm,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  const points=[actor,actor.exit,state.villages[0]],bounds=[
   Math.min(...points.map(p=>p.x))-24,Math.min(...points.map(p=>p.z))-24,
   Math.max(...points.map(p=>p.x))+24,Math.max(...points.map(p=>p.z))+24];
  const chunk=value=>Math.floor((value+24)/48);
  for(let cz=chunk(bounds[1]);cz<=chunk(bounds[3]);cz++)
   for(let cx=chunk(bounds[0]);cx<=chunk(bounds[2]);cx++){
    if(session.core.selectChunk(cx,cz)<0)assert(session.core.addChunk(cx,cz)>=0);
    loaded.set(`${cx},${cz}`,session.core.chunkPayload());
   }
  const nav=createSpatialNavigationMovement(session,state);nav.setActiveBounds(bounds);
  const profile={worker:false,species:actor.species};
  assert.equal(session.routeActor(actor,actor.exit,profile).status,'unknown');
  const destination={...actor.exit,id:`exit-${actor.id}`};
  // This frozen search was already exhausted. Adapt only its revision to the
  // current native graph; the bridge rechecks every new physical segment.
  actor.exitConnectorSearch.key=JSON.stringify([nav.version,actor.x,actor.z,
    destination.x,destination.z,actor.radius]);
  for(let i=0;i<32&&!actor.path;i++)walkTo(state,actor,destination,0,nav,
   {speed:3.8,worker:false,expandRoute:true,routeVia:actor.spawn});
  const path=actor.path;
  assert(path?.length>1,'bounded local probes should reach the native graph');
  assert.equal(state.events.some(event=>event.type==='AnimalRetreatExitAbandoned'&&
    event.actorId===actor.id),false,
  'a pending physical bridge must not remove an animal with hits remaining');
  assert.equal(actor.exitConnectorSearch,undefined);
  assert(Math.hypot(path[0].x-actor.x,path[0].z-actor.z)<=.5+1e-8);
  const last=path.at(-1);assert(Math.hypot(last.x-actor.exit.x,last.z-actor.exit.z)<1e-8);
  let from=actor;
  for(const point of path){
   assert(nav.walkable(point.x,point.z,actor.radius,null,false));
   assert(nav.segmentClear(from,point,actor.radius,null,false),
    `invalid physical exit segment ${JSON.stringify(from)} -> ${JSON.stringify(point)}`);
   from=point;
  }
  let exited=false;
  for(let tick=0;tick<90&&!exited;tick++){
   const before={x:actor.x,z:actor.z},priorPath=[...(actor.path??[])];state.elapsed+=1;
   exited=walkTo(state,actor,destination,1,nav,
    {speed:3.8,worker:false,expandRoute:true,routeVia:actor.spawn});
   const consumed=priorPath.slice(0,Math.max(0,priorPath.length-(actor.path?.length??0)));
   let previous=before;
   for(const point of [...consumed,actor]){
    assert(nav.segmentClear(previous,point,actor.radius,null,false),
     `invalid movement segment on tick ${tick}`);
    previous=point;
   }
   assert(Math.hypot(actor.x-before.x,actor.z-before.z)<=3.8+1e-8);
  }
  assert(exited,'retreat should physically reach its exit');
  assert(Math.hypot(actor.x-destination.x,actor.z-destination.z)<1e-6);
 }finally{session.dispose();}
});

test('a native bridge retries unknown only after residency changes and never crosses solids',()=>{
 const actor={status:'retreating',x:0,z:0,radius:1},end={x:10,z:0};
 let residencyRevision=1,topology=1,requests=0,allowed=false;
 const nav={get version(){return topology;},get residencyRevision(){return residencyRevision;},
  spatialSectorRevision:()=>1,walkable:()=>true,
  segmentClear:(a,b)=>b===end?a.z>.49:
   Math.hypot(b.x-a.x,b.z-a.z)<=.51&&b.z>.49,
  path:()=>{if(!allowed){const error=new Error('resident sectors missing');
   error.name='SpatialChunkUnavailable';throw error;}return [end];},
  requestRaidConnectivity:()=>{requests++;}};
 for(let i=0;i<20;i++)animalNativeExitBridge(actor,end,nav);
 assert(requests>0);assert.equal(animalNativeExitBridge(actor,end,nav).path,null);
 allowed=true;residencyRevision++;
 let result;
 for(let i=0;i<20&&!result?.path;i++)result=animalNativeExitBridge(actor,end,nav);
 assert(result?.path);assert(nav.segmentClear(actor,result.path[0]));
 topology++;nav.segmentClear=()=>false;
 for(let i=0;i<20;i++)assert.equal(animalNativeExitBridge(actor,end,nav).path,null);
});
