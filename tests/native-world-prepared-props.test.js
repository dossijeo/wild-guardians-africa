import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from '../src/world/wild-engine/spatial-movement-profiles.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
const id=p=>({group:p.group,gx:p.gx,gz:p.gz});
const key=p=>`${p.group}:${p.gx}:${p.gz}`;
const boundary=t=>({nativeSession:t[0],ticket:t[1],effectiveTime:t[3]});
function fixture(biome){
 const raw=new WebAssembly.Instance(module,{env:{emscripten_notify_memory_growth(){}},wasi_snapshot_preview1:{proc_exit(code){throw Error(String(code));}}}).exports;raw._initialize?.();let selects=0;
 const w={...raw,spatial_select_chunk(...args){selects++;return raw.spatial_select_chunk(...args);}},core=createSpatialWorld(null,{exports:w});
 core.generate(712,0,0,biome);for(const [x,z] of [[-1,0],[1,0],[0,-1],[0,1]])assert(core.addChunk(x,z)>=0);
 core.setSettlement(0,0,3,3);assert(core.addWall(2,5,.4,6,.2)>0);
 for(const [profile,radius] of [.2,.28,.4,.6,.8,1.1].entries())assert(w.spatial_build_nav_profile(profile,radius,profile===1?1:0)>0);
 w.nav_intent_reset();assert.equal(w.nav_intent_set_time(10),1);assert.equal(w.nav_intent_clock_commit(1,1),1);
 return {w,core,get selects(){return selects;}};
}
function props(core){const selected=core.currentChunk(),found=new Map();for(const value of core.captureResidentChunks().keys){const [x,z]=value.split(',').map(Number);core.selectChunk(x,z);for(const p of core.props())if(p.group<=5)found.set(key(p),p);}core.selectChunk(selected.cx,selected.cz);return [...found.values()];}
function stage(f,kind,integers,prepared=true){f.w.spatial_world_proposal_float_ptr(0);const ptr=f.w.spatial_world_proposal_int_ptr(integers.length);new Int32Array(f.w.memory.buffer,ptr,integers.length).set(integers);assert.equal(f.w[prepared?'spatial_world_proposal_stage_resources':'spatial_world_proposal_stage'](kind,0,0,integers.length),1);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));}
function profiles(f){const result=[];for(let p=0;p<6;p++){f.w.spatial_select_nav_profile_index(p);result.push([f.w.lazy_route_revision(),f.w.lazy_loaded_sectors()]);}return result;}
function graph(f,prop){const out=[],x0=Math.floor(prop.x),z0=Math.floor(prop.z);let actualRoutes=0;
 for(let p=0;p<6;p++){f.w.spatial_select_nav_profile_index(p);let routed=false;
  for(let z=z0-12;z<=z0+12;z++)for(let x=x0-12;x<=x0+12;x++){
   out.push(f.w.spatial_walkable(x,z));for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const edge=f.w.spatial_edge(x,z,x+dx,z+dz);out.push(edge);if(edge&&!routed){const n=f.w.lazy_route(x,z,x+dx,z+dz);assert(n>0);out.push(n,...new Int32Array(f.w.memory.buffer,f.w.lazy_route_ptr(),n*2));routed=true;actualRoutes++;}}
  }
 }assert(actualRoutes>0,'requires actual passable routes');return out;
}
for(const biome of ['sabana','desierto','gran-rio','volcanes','manglares','gran-canon'])test(`prepared prop suppression preserves canonical resources and six-profile graph in ${biome}`,()=>{
 const a=fixture(biome),b=fixture(biome),prop=props(a.core).find(p=>Math.hypot(p.x,p.z)>25);assert(prop);const integers=[prop.group,prop.gx,prop.gz],before=profiles(a),resident=a.core.captureResidentChunks(),selected=a.core.currentChunk(),ta=stage(a,8,integers),tb=stage(b,8,integers,false);
 assert.deepEqual(profiles(a),before);assert.deepEqual(a.core.captureResidentChunks(),resident);assert.deepEqual(a.core.currentChunk(),selected);assert(props(a.core).some(p=>key(p)===key(prop)));
 const preview=a.core.captureNativeWorldProposalResources(boundary(ta));assert.equal(a.w.spatial_world_proposal_commit(...ta.slice(0,5)),1);assert.equal(b.w.spatial_world_proposal_commit(...tb.slice(0,5)),1);
 assert.equal(a.w.spatial_world_proposal_resource_release(ta[0],ta[1]),1);assert.equal(a.w.spatial_world_resource_prepared_snapshot(ta[0],ta[1]),1);const selects=a.selects,actual=a.core.captureNativeWorldResources(boundary(ta));assert.equal(a.selects,selects);
 assert.deepEqual(actual.chunks,preview.chunks);assert.deepEqual(actual.chunks,b.core.captureNativeWorldResources(boundary(tb)).chunks);assert.deepEqual(a.core.snapshot(),b.core.snapshot());assert.deepEqual(profiles(a),profiles(b));assert.deepEqual(graph(a,prop),graph(b,prop));assert(!props(a.core).some(p=>key(p)===key(prop)));
 actual.chunks[0].terrain.colors[0]+=1;assert.deepEqual(a.core.captureNativeWorldResources(boundary(ta)).chunks,preview.chunks);
});

for(const count of [1,2])test(`prepared protected restoration installs ${count} prop changes without re-running canonical recipes`,()=>{
 const a=createNativeRouteExecutionFixture(),b=createNativeRouteExecutionFixture();
 try{
  const base=a.session.core.snapshot().removedProps,candidates=props(a.session.core).filter(p=>Math.hypot(p.x-a.point(0,0).x,p.z-a.point(0,0).z)>35),chosen=[candidates[0]];if(count===2)chosen.push(candidates.find(p=>Math.hypot(p.x-chosen[0].x,p.z-chosen[0].z)>48));assert(chosen.every(Boolean));
  for(const f of [a,b]){for(const p of [WORKER_SPATIAL_PROFILE,...Object.values(ANIMAL_SPATIAL_PROFILES)])f.session.core.buildNavigationProfile(p.index,p.radius,p.worker);f.route=f.worker(1,f.point(-6,0),f.point(6,0));assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(11).status,'advanced');for(const prop of chosen)assert.equal(f.session.core.removeProp(id(prop)),1);assert.equal(f.bridge.commitNativeCausalClock().status,'committed');f.core=f.session.core;}
  const integers=base.flatMap(p=>[p.group,p.gx,p.gz]),before=profiles(a),ta=stage(a,9,integers),tb=stage(b,9,integers,false),preview=a.core.captureNativeWorldProposalResources(boundary(ta)),recipes=a.w.nav_intent_props_mutation_recipe_chunks();assert.deepEqual(profiles(a),before);
  assert.equal(a.w.spatial_world_proposal_commit(...ta.slice(0,5)),1);assert.equal(b.w.spatial_world_proposal_commit(...tb.slice(0,5)),1);assert.equal(a.w.nav_intent_props_mutation_recipe_chunks(),recipes,'commit uses prepared candidates instead of regenerating recipes');assert(b.w.nav_intent_props_mutation_recipe_chunks()>recipes,'canonical comparison really regenerated candidates');
  assert.equal(a.w.spatial_world_resource_prepared_snapshot(ta[0],ta[1]),1);assert.deepEqual(a.core.captureNativeWorldResources(boundary(ta)).chunks,preview.chunks);assert.deepEqual(preview.chunks,b.core.captureNativeWorldResources(boundary(tb)).chunks);assert.deepEqual(a.core.snapshot(),b.core.snapshot());assert.deepEqual(profiles(a),profiles(b));for(const p of chosen)assert.deepEqual(graph(a,p),graph(b,p));
  assert.equal(a.advance(12).status,'advanced');assert.equal(b.advance(12).status,'advanced');assert.deepEqual(a.body(1),b.body(1));const {routeHandle:ha,...timingA}=a.bridge.nativeRouteTiming(a.route),{routeHandle:hb,...timingB}=b.bridge.nativeRouteTiming(b.route);assert.equal(ha.authorityEpoch,a.route.authorityEpoch);assert.equal(hb.authorityEpoch,b.route.authorityEpoch);assert.notEqual(ha.authorityEpoch,hb.authorityEpoch);assert.deepEqual(timingA,timingB);
 }finally{a.session.dispose();b.session.dispose();}
});

test('a graph or profile change invalidates prepared prop patches before any physical edit',()=>{
 for(const change of [f=>{f.w.spatial_select_nav_profile_index(0);f.w.lazy_reject_route_edge(-40,0,-39,0);},f=>f.w.spatial_build_nav_profile(2,.45,0)]){
  const f=fixture('desierto'),p=props(f.core).find(p=>Math.hypot(p.x,p.z)>25),t=stage(f,8,[p.group,p.gx,p.gz]),before=f.core.snapshot();change(f);assert.equal(f.w.spatial_world_proposal_resource_snapshot(t[0],t[1]),-1);assert.equal(f.w.spatial_world_proposal_commit(...t.slice(0,5)),-2);assert.deepEqual(f.core.snapshot(),before);
 }
});

test('keys without a generated prop do not invent graphical chunks or graph updates',()=>{
 const a=createNativeRouteExecutionFixture(),b=createNativeRouteExecutionFixture(),unknown={group:5,gx:0,gz:0};
 try{
  for(const f of [a,b]){f.core=f.session.core;assert(!props(f.core).some(p=>key(p)===key(unknown)));f.worker(1,f.point(-6,0),f.point(6,0));assert.equal(f.bridge.beginNativeRouteExecution().status,'started');f.bridge.commitNativeCausalClock();}
  const base=a.core.snapshot().removedProps;
  for(const records of [[...base,unknown],base]){
   const integers=records.flatMap(p=>[p.group,p.gx,p.gz]),before=profiles(a),ta=stage(a,9,integers),tb=stage(b,9,integers,false),preview=a.core.captureNativeWorldProposalResources(boundary(ta));assert.deepEqual(preview.chunks,[]);
   const recipes=a.w.nav_intent_props_mutation_recipe_chunks();assert.equal(a.w.spatial_world_proposal_commit(...ta.slice(0,5)),1);assert.equal(b.w.spatial_world_proposal_commit(...tb.slice(0,5)),1);assert.equal(a.w.nav_intent_props_mutation_recipe_chunks(),recipes);assert.deepEqual(a.core.captureNativeWorldResources(boundary(ta)).chunks,[]);assert.deepEqual(a.core.snapshot(),b.core.snapshot());assert.deepEqual(profiles(a),before);assert.deepEqual(profiles(a),profiles(b));
   a.bridge.commitNativeCausalClock();b.bridge.commitNativeCausalClock();
  }
 }finally{a.session.dispose();b.session.dispose();}
});

test('restoration without a native protection domain preserves the legacy canonical path',()=>{
 const a=fixture('desierto'),b=fixture('desierto'),p=props(a.core).find(p=>Math.hypot(p.x,p.z)>25);assert(p);
 for(const f of [a,b])assert.equal(f.core.removeProp(id(p)),1);
 const ta=stage(a,9,[]),tb=stage(b,9,[],false);assert.equal(a.w.spatial_world_proposal_commit(...ta.slice(0,5)),1);assert.equal(b.w.spatial_world_proposal_commit(...tb.slice(0,5)),1);assert.equal(a.w.spatial_world_resource_prepared_snapshot(ta[0],ta[1]),0);assert.deepEqual(a.core.captureNativeWorldResources(boundary(ta)).chunks,b.core.captureNativeWorldResources(boundary(tb)).chunks);assert.deepEqual(a.core.snapshot(),b.core.snapshot());assert.deepEqual(profiles(a),profiles(b));assert.deepEqual(graph(a,p),graph(b,p));
});

test('a body introduced under a proposed restored prop invalidates preparation without restoring it',()=>{
 const f=createNativeRouteExecutionFixture();try{
  f.core=f.session.core;const base=f.core.snapshot().removedProps,p=props(f.core).find(p=>p.radius>0&&Math.hypot(p.x-f.point(0,0).x,p.z-f.point(0,0).z)>35);assert(p);f.worker(1,f.point(-6,0),f.point(6,0));assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.core.removeProp(id(p)),1);f.bridge.commitNativeCausalClock();
  const t=stage(f,9,base.flatMap(p=>[p.group,p.gx,p.gz])),before=f.core.snapshot();assert.equal(f.w.spatial_body_upsert(99,p.x,p.z,.28,0,1),1);assert.equal(f.w.spatial_world_proposal_resource_snapshot(t[0],t[1]),-1);assert.equal(f.w.spatial_world_proposal_commit(...t.slice(0,5)),-2);assert.deepEqual(f.core.snapshot(),before);assert(!props(f.core).some(v=>key(v)===key(p)));
 }finally{f.session.dispose();}
});

test('the real pthread runtime installs prepared props and rejects its earlier background recipe',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory),f=createNativeRouteExecutionFixture({core:runtime.core});
 try{
  f.core=f.session.core;for(const p of [WORKER_SPATIAL_PROFILE,...Object.values(ANIMAL_SPATIAL_PROFILES)])f.core.buildNavigationProfile(p.index,p.radius,p.worker);
  const base=f.core.snapshot().removedProps,p=props(f.core).find(p=>Math.hypot(p.x-f.point(0,0).x,p.z-f.point(0,0).z)>35);assert(p);f.worker(1,f.point(-6,0),f.point(6,0));assert.equal(f.bridge.beginNativeRouteExecution().status,'started');f.bridge.commitNativeCausalClock();
  const job=f.core.preparation.start(4,4);assert(job>0);const deadline=Date.now()+10000;while(f.core.preparation.status()!==3&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,4));assert.equal(f.core.preparation.status(),3);
  for(const [kind,integers] of [[8,[p.group,p.gx,p.gz]],[9,base.flatMap(p=>[p.group,p.gx,p.gz])]]){
   const t=stage(f,kind,integers),preview=f.core.captureNativeWorldProposalResources(boundary(t)),recipes=f.w.nav_intent_props_mutation_recipe_chunks();assert.equal(f.w.spatial_world_proposal_commit(...t.slice(0,5)),1);assert.equal(f.w.nav_intent_props_mutation_recipe_chunks(),recipes);assert.equal(f.w.spatial_world_resource_prepared_snapshot(t[0],t[1]),1);assert.deepEqual(f.core.captureNativeWorldResources(boundary(t)).chunks,preview.chunks);
   if(kind===8){assert.equal(f.core.preparation.publish(job,4,4),-2);assert.equal(f.core.preparation.release(),1);assert(!f.core.hasResidentChunk(4,4));}
   f.bridge.commitNativeCausalClock();
  }
  assert.equal(f.advance(11).status,'advanced');
 }finally{f.session.dispose();await runtime.dispose();}
});
