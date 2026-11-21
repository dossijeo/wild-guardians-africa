import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createNativeRouteExecutionFixture} from './helpers/native-route-execution.js';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from '../src/world/wild-engine/spatial-movement-profiles.js';
import {createThreadedSpatialWorld} from '../src/world/wild-engine/spatial-thread-runtime.js';

const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
const boundary=t=>({nativeSession:t[0],ticket:t[1],effectiveTime:t[3]});
function fixture(){const raw=new WebAssembly.Instance(module,{env:{emscripten_notify_memory_growth(){}},wasi_snapshot_preview1:{proc_exit(code){throw Error(String(code));}}}).exports;raw._initialize?.();let selects=0;const w={...raw,spatial_select_chunk(...args){selects++;return raw.spatial_select_chunk(...args);}},core=createSpatialWorld(null,{exports:w}),f=createNativeRouteExecutionFixture({core});f.core=core;Object.defineProperty(f,'selects',{get:()=>selects});return f;}
function activate(f){for(const p of [WORKER_SPATIAL_PROFILE,...Object.values(ANIMAL_SPATIAL_PROFILES)])f.core.buildNavigationProfile(p.index,p.radius,p.worker);f.route=f.worker(1,f.point(-6,0),f.point(6,0));assert.equal(f.bridge.beginNativeRouteExecution().status,'started');assert.equal(f.advance(11).status,'advanced');f.bridge.commitNativeCausalClock();}
function stage(f,sites,replace=false,prepared=true){f.w.spatial_world_proposal_int_ptr(0);const values=sites.flatMap(p=>[p.x,p.z,p.hx,p.hz,p.waterFalloff??3]),ptr=f.w.spatial_world_proposal_float_ptr(values.length);new Float32Array(f.w.memory.buffer,ptr,values.length).set(values);assert.equal(f.w[prepared?'spatial_world_proposal_stage_resources':'spatial_world_proposal_stage'](10,replace?1:0,values.length,0),1);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));}
function profiles(f){const values=[];for(let p=0;p<6;p++){f.w.spatial_select_nav_profile_index(p);values.push([f.w.lazy_route_revision(),f.w.lazy_loaded_sectors(),f.w.lazy_sector_updates?.()]);}return values;}
function graph(f){const values=[];let routes=0;for(let p=0;p<6;p++){f.w.spatial_select_nav_profile_index(p);let routed=false;const seams=new Set();for(let z=-73;z<=73;z++)for(let x=-73;x<=73;x++){values.push(f.w.spatial_walkable(x,z));for(const [dx,dz] of [[1,0],[-1,0],[0,1],[0,-1]]){const edge=f.w.spatial_edge(x,z,x+dx,z+dz);values.push(edge);if(edge&&!routed){const n=f.w.lazy_route(x,z,x+dx,z+dz);assert(n>0);values.push(n,...new Int32Array(f.w.memory.buffer,f.w.lazy_route_ptr(),n*2));routed=true;routes++;}const seam=dx===1&&[-24,24].includes(x+1)?'x'+(x+1):dz===1&&[-24,24].includes(z+1)?'z'+(z+1):null;if(edge&&seam&&!seams.has(seam)){const n=f.w.lazy_route(x,z,x+dx,z+dz);assert(n>0,'a passable chunk seam must have a real graph route');values.push(seam,n,...new Int32Array(f.w.memory.buffer,f.w.lazy_route_ptr(),n*2));seams.add(seam);routes++;}}}assert(seams.size>0,'each active profile must cross a resident chunk seam');}assert(routes>0);return values;}
function compareRoutes(a,b){const {routeHandle:ha,...ta}=a.bridge.nativeRouteTiming(a.route),{routeHandle:hb,...tb}=b.bridge.nativeRouteTiming(b.route);assert.equal(ha.authorityEpoch,a.route.authorityEpoch);assert.equal(hb.authorityEpoch,b.route.authorityEpoch);assert.deepEqual(ta,tb);}

for(const mode of ['append','overlapping','replace','restore','distant','empty'])test(`prepared terrain ${mode} preserves canonical geometry and sequential six-profile graph`,()=>{
 const a=fixture(),b=fixture();try{
  const base=a.core.snapshot().settlements,extra={x:50,z:50,hx:2,hz:2,waterFalloff:3};for(const f of [a,b]){activate(f);if(mode==='restore'){f.core.applySettlements([extra],{replace:false});f.bridge.commitNativeCausalClock();}}
  const sites=mode==='distant'?[{x:1000,z:1000,hx:1,hz:1}]:mode==='empty'?[]:mode==='restore'?base:mode==='replace'?[...base,extra]:mode==='overlapping'?[extra,{x:65,z:20,hx:3,hz:2}]:[extra],replace=['replace','restore'].includes(mode),before=profiles(a),resident=a.core.captureResidentChunks(),snapshot=a.core.snapshot(),oldSelected=a.core.currentChunk(),body=a.body(1),ta=stage(a,sites,replace),tb=stage(b,sites,replace,false);
  assert.deepEqual(profiles(a),before);assert.deepEqual(a.core.snapshot(),snapshot);assert.deepEqual(a.core.captureResidentChunks(),resident);assert.deepEqual(a.core.currentChunk(),oldSelected);assert.deepEqual(a.body(1),body);
  const preview=a.core.captureNativeWorldProposalResources(boundary(ta)),recipes=a.w.nav_intent_terrain_recipe_chunks(),canonicalRecipes=b.w.nav_intent_terrain_recipe_chunks();assert.equal(a.w.spatial_world_proposal_commit(...ta.slice(0,5)),1);assert.equal(b.w.spatial_world_proposal_commit(...tb.slice(0,5)),1);assert.equal(a.w.nav_intent_terrain_recipe_chunks(),recipes,'commit must not regenerate the prepared terrain');if(preview.chunks.length)assert(b.w.nav_intent_terrain_recipe_chunks()>canonicalRecipes,'the unprepared comparison really regenerated its candidates');
  assert.equal(a.w.spatial_world_proposal_resource_release(ta[0],ta[1]),1);assert.equal(a.w.spatial_world_resource_prepared_snapshot(ta[0],ta[1]),1);const selects=a.selects,actual=a.core.captureNativeWorldResources(boundary(ta));assert.equal(a.selects,selects,'projection uses owned prepared buffers');assert.deepEqual(actual.chunks,preview.chunks);assert.deepEqual(actual.chunks,b.core.captureNativeWorldResources(boundary(tb)).chunks);assert.deepEqual(a.core.snapshot(),b.core.snapshot());assert.deepEqual(profiles(a),profiles(b));assert.deepEqual(graph(a),graph(b));
  assert.deepEqual(a.core.changedChunks(),b.core.changedChunks());if(!['distant','empty'].includes(mode))assert(actual.chunks.length>1,'exercise neighbor borders and multiple changed chunks');else assert.equal(actual.chunks.length,0);
  assert.equal(a.advance(12).status,'advanced');assert.equal(b.advance(12).status,'advanced');assert.deepEqual(a.body(1),b.body(1));compareRoutes(a,b);
  if(actual.chunks.length){actual.chunks[0].terrain.positions[1]+=100;assert.deepEqual(a.core.captureNativeWorldResources(boundary(ta)).chunks,preview.chunks);}
 }finally{a.session.dispose();b.session.dispose();}
});

test('prepared terrain rejects new graph/profile dependencies before touching physical inputs',()=>{
 for(const change of [f=>{f.w.spatial_select_nav_profile_index(0);f.w.lazy_reject_route_edge(-40,0,-39,0);},f=>f.w.spatial_build_nav_profile(2,.45,0)]){
  const f=fixture();try{activate(f);const t=stage(f,[{x:50,z:50,hx:2,hz:2}]),before=f.core.snapshot();change(f);assert.equal(f.w.spatial_world_proposal_resource_snapshot(t[0],t[1]),-1);assert.equal(f.w.spatial_world_proposal_commit(...t.slice(0,5)),-2);assert.deepEqual(f.core.snapshot(),before);}finally{f.session.dispose();}
 }
});

test('a new body on changed support invalidates the terrain candidate without committing it',()=>{
 const f=fixture();try{activate(f);const t=stage(f,[{x:50,z:50,hx:2,hz:2}]),before=f.core.snapshot();assert.equal(f.w.spatial_body_upsert(99,50,50,.28,0,1),1);assert.equal(f.w.spatial_world_proposal_resource_snapshot(t[0],t[1]),-1);assert.equal(f.w.spatial_world_proposal_commit(...t.slice(0,5)),-2);assert.deepEqual(f.core.snapshot(),before);}finally{f.session.dispose();}
});

test('the real pthread runtime installs prepared terrain and retires its earlier background input',async()=>{
 const {default:factory}=await import('../public/wild-engine/spatial-threaded.mjs'),runtime=await createThreadedSpatialWorld(factory),f=createNativeRouteExecutionFixture({core:runtime.core});f.core=f.session.core;
 try{activate(f);const job=f.core.preparation.start(4,4);assert(job>0);const deadline=Date.now()+10000;while(f.core.preparation.status()!==3&&Date.now()<deadline)await new Promise(resolve=>setTimeout(resolve,4));assert.equal(f.core.preparation.status(),3);
  const t=stage(f,[{x:50,z:50,hx:2,hz:2}]),preview=f.core.captureNativeWorldProposalResources(boundary(t)),recipes=f.w.nav_intent_terrain_recipe_chunks();assert.equal(f.w.spatial_world_proposal_commit(...t.slice(0,5)),1);assert.equal(f.w.nav_intent_terrain_recipe_chunks(),recipes);assert.equal(f.w.spatial_world_resource_prepared_snapshot(t[0],t[1]),1);assert.deepEqual(f.core.captureNativeWorldResources(boundary(t)).chunks,preview.chunks);assert.equal(f.core.preparation.publish(job,4,4),-2);assert.equal(f.core.preparation.release(),1);assert(!f.core.hasResidentChunk(4,4));assert.equal(f.advance(12).status,'advanced');
 }finally{f.session.dispose();await runtime.dispose();}
});

test('terrain without a native protection domain keeps its canonical legacy installation',()=>{
 const cores=[createSpatialWorld(module),createSpatialWorld(module)];for(const core of cores){core.generate(712,0,0,'desierto');core.addChunk(1,0);core.buildNavigationProfile(1,.28,true);core.wasm.nav_intent_reset();core.wasm.nav_intent_set_time(10);core.wasm.nav_intent_clock_commit(1,1);}
 const [a,b]=cores.map(core=>({core,w:core.wasm})),ta=stage(a,[{x:50,z:0,hx:2,hz:2}]),tb=stage(b,[{x:50,z:0,hx:2,hz:2}],false,false);assert.equal(a.w.spatial_world_proposal_commit(...ta.slice(0,5)),1);assert.equal(b.w.spatial_world_proposal_commit(...tb.slice(0,5)),1);assert.equal(a.w.spatial_world_resource_prepared_snapshot(ta[0],ta[1]),0);assert.deepEqual(a.core.captureNativeWorldResources(boundary(ta)).chunks,b.core.captureNativeWorldResources(boundary(tb)).chunks);assert.deepEqual(a.core.snapshot(),b.core.snapshot());assert.deepEqual(profiles(a),profiles(b));
});
