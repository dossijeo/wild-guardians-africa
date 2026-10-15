import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {deserialize} from '../src/persistence/snapshots.js';
import {gatePortalPoints} from '../src/world/gate-passages.js';
import {createSpatialGameSession} from '../src/world/hierarchical-wasm/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../src/world/hierarchical-wasm/spatial-navigation-movement.js';

const prototype=process.env.WILD_ENGINE_NATIVE_ROUTE_WASM;
const binary=prototype??new URL(
  '../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url);
const module=new WebAssembly.Module(readFileSync(binary));
const state=deserialize(gunzipSync(readFileSync(new URL(
  './fixtures/desierto983-d15-partial-state.json.gz',import.meta.url))).toString());

test('native world planner matches fractional connectors and automatic gate routes',
 {skip:!prototype&&'Build and select the experimental WASM first'},()=>{
 const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  assert.equal(typeof session.core.wasm.spatial_world_route,'function');
  for(let z=-1;z<=1;z++)for(let x=0;x<=2;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
   loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const nav=createSpatialNavigationMovement(session,state);
  nav.setActiveBounds([-24,-72,120,72]);
  const gates=state.structures.filter(s=>s.gate&&s.status!=='ruined').slice(0,3);
  assert(gates.length>0);
  const queries=[];
  for(const gate of gates){
   const [a,b]=gatePortalPoints(gate,.28);
   queries.push([a,b,{worker:true}],[b,a,{worker:true}],
    [a,b,{worker:false,species:'warthog'}]);
  }
  const crops=state.plants.filter(p=>p.alive).slice(0,8);
  for(let i=0;i<crops.length-1;i++){
   queries.push([crops[i],crops[i+1],{worker:true}]);
   queries.push([crops[i],crops[i+1],{worker:false,species:'hyena'}]);
  }
  const tally={found:0,blocked:0,unknown:0};
  for(const [start,end,options] of queries){
   const reference=session.routeActor(start,end,options);
   const native=session.core.routeWorldNative(start,end);
   assert.equal(native.status,reference.status,JSON.stringify({start,end,options}));
   tally[native.status]++;
   if(native.status!=='found'){
    if(native.status==='unknown')assert.equal(native.reason,reference.reason);
    continue;
   }
   assert.equal(native.points.length,reference.points.length);
   for(let i=0;i<native.points.length;i++){
    assert(Math.abs(native.points[i].x-reference.points[i].x)<1e-4);
    assert(Math.abs(native.points[i].z-reference.points[i].z)<1e-4);
   }
  }
  assert(tally.found>0);
  assert(tally.blocked+tally.unknown>0);
 }finally{session.dispose();}
});

test('native route cache follows local wall changes and sector residence',
 {skip:!prototype&&'Build and select the experimental WASM first'},()=>{
 const sameRoute=(a,b)=>{
  assert.equal(a.status,b.status);
  assert.equal(a.reason,b.reason);
  assert.equal(a.points.length,b.points.length);
  for(let i=0;i<a.points.length;i++){
   assert(Math.abs(a.points[i].x-b.points[i].x)<1e-4);
   assert(Math.abs(a.points[i].z-b.points[i].z)<1e-4);
  }
 };
 const loaded=new Map(),session=createSpatialGameSession(module,state,{
  loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  assert.equal(typeof session.core.wasm.spatial_world_route_cached,'function');
  for(let z=-1;z<=1;z++)for(let x=0;x<=2;x++){
   if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);
   loaded.set(`${x},${z}`,session.core.chunkPayload());
  }
  const opts={worker:true,cached:true};
  let selected=null;
  const center=state.villages[0];
  for(let dz=-12;dz<=12&&!selected;dz++)for(let dx=-12;dx<=12;dx++){
   const a={x:Math.floor(center.x)+dx+.2,z:Math.floor(center.z)+dz+.2};
   const b={x:a.x+1,z:a.z};
   const route=session.routeActor(a,b,{worker:true});
   if(route.status==='found'&&route.points.length===1){selected=[a,b];break;}
  }
  assert(selected,'fixture has a direct fractional worker segment');
  const [a,b]=selected;
  const first=session.routeActorNative(a,b,opts);
  const hit=session.routeActorNative(a,b,opts);
  assert.deepEqual(hit,first);
  const beforeHits=session.core.wasm.spatial_route_cache_hits();
  assert(beforeHits>0);
  const ids=session.core.applyBarrierChanges([],[{x:(a.x+b.x)/2,z:(a.z+b.z)/2,
   halfX:.4,halfZ:.4,passMask:0}]);
  try{
   const fresh=session.routeActor(a,b,{worker:true});
   const cached=session.routeActorNative(a,b,opts);
   sameRoute(cached,fresh);
   assert.notDeepEqual(cached,first,'new barrier changes the route');
  }finally{session.core.applyBarrierChanges(ids,[]);}
  assert.deepEqual(session.routeActorNative(a,b,opts),first);
  const village=state.villages[0];
  const cx=Math.floor((village.x+24)/48),cz=Math.floor((village.z+24)/48);
  session.core.removeChunk(cx,cz);
  const afterUnload=session.routeActorNative(a,b,opts);
  sameRoute(afterUnload,session.routeActor(a,b,{worker:true}));
  session.core.addChunk(cx,cz);
  sameRoute(session.routeActorNative(a,b,opts),session.routeActor(a,b,{worker:true}));
  const gates=state.structures.filter(s=>s.gate&&s.status!=='ruined');
  const misses=session.core.wasm.spatial_route_cache_misses();
  session.core.setWorkerGatePortals([]);
  sameRoute(session.routeActorNative(a,b,opts),session.routeActor(a,b,{worker:true}));
  assert(session.core.wasm.spatial_route_cache_misses()>misses,
   'a portal-only revision invalidates the native route');
  session.core.setWorkerGatePortals(gates);
  sameRoute(session.routeActorNative(a,b,opts),session.routeActor(a,b,{worker:true}));
 }finally{session.dispose();}
});
