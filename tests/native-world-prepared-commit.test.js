import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';

const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
function fixture(biome='desierto'){
 const raw=new WebAssembly.Instance(module,{env:{emscripten_notify_memory_growth(){}},wasi_snapshot_preview1:{proc_exit(code){throw Error(String(code));}}}).exports;raw._initialize?.();let selects=0;
 const w={...raw,spatial_select_chunk(...args){selects++;return raw.spatial_select_chunk(...args);}},core=createSpatialWorld(null,{exports:w});
 core.generate(712,-1,0,biome);for(const [x,z] of [[1,0],[0,-1],[0,1]])assert(core.addChunk(x,z)>=0);
 core.setSettlement(0,0,3,3);assert(core.addWall(2,5,.4,6,.2)>0);
 for(const [profile,radius] of [.2,.28,.4,.6,.8,1.1].entries())assert(w.spatial_build_nav_profile(profile,radius,profile===1?1:0)>0);
 w.nav_intent_reset();assert.equal(w.nav_intent_set_time(10),1);assert.equal(w.nav_intent_clock_commit(1,1),1);
 return {w,core,get selects(){return selects;}};
}
function profiles(f){const rows=[];for(let i=0;i<6;i++){f.w.spatial_select_nav_profile_index(i);rows.push([f.w.lazy_route_revision(),f.w.lazy_loaded_sectors()]);}return rows;}
function stage(f,prepared=true){f.w.spatial_world_proposal_float_ptr(0);const ptr=f.w.spatial_world_proposal_int_ptr(2);new Int32Array(f.w.memory.buffer,ptr,2).set([0,0]);assert.equal(f.w[prepared?'spatial_world_proposal_stage_resources':'spatial_world_proposal_stage'](6,0,0,2),1);assert.equal(f.w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(f.w.memory.buffer,f.w.nav_intent_barrier_proposal_ticket_ptr(),6));}
function commit(f,t){const result=f.w.spatial_world_proposal_commit(...t.slice(0,5));if(result===1){const count=f.w.spatial_world_proposal_result_count(),ids=Array.from(new Int32Array(f.w.memory.buffer,f.w.spatial_world_proposal_result_ptr(),count));f.core.adoptNativeResidencyCommit(6,ids);}return result;}
const boundary=t=>({nativeSession:t[0],ticket:t[1],effectiveTime:t[3]});
function grid(f){const values=[];for(let p=0;p<6;p++){f.w.spatial_select_nav_profile_index(p);for(let z=-25;z<=25;z++)for(let x=-25;x<=25;x++)values.push(f.w.spatial_walkable(x,z),...[[1,0],[-1,0],[0,1],[0,-1]].map(([dx,dz])=>f.w.spatial_edge(x,z,x+dx,z+dz)));}return Uint8Array.from(values);}
function routes(f){const values=[];let seamRoutes=0;
 for(let p=0;p<6;p++){
  f.w.spatial_select_nav_profile_index(p);
  for(const row of [[-40,0,40,0],[0,-40,0,40],[-25,-5,25,5],[-8,-25,8,25]]){const n=f.w.lazy_route(...row);values.push(n,n>0?Array.from(new Int32Array(f.w.memory.buffer,f.w.lazy_route_ptr(),n*2)):[]);}
  // Demand an actual nonempty graph route for passable seam edges, rather
  // than claiming route equivalence solely from pairs of failed queries.
  for(let direction=0;direction<4;direction++)for(let i=-23;i<24;i++){
   const x=direction<2?(direction===0?-25:23):i,z=direction>=2?(direction===2?-25:23):i,nx=x+(direction<2?1:0),nz=z+(direction>=2?1:0);
   if(!f.w.spatial_edge(x,z,nx,nz))continue;
   const n=f.w.lazy_route(x,z,nx,nz);assert(n>0,'a passable seam edge must have a graph route');seamRoutes++;values.push([p,x,z,nx,nz],n,Array.from(new Int32Array(f.w.memory.buffer,f.w.lazy_route_ptr(),n*2)));break;
  }
 }
 assert(seamRoutes>0,'fixture must exercise passable chunk seams');return values;
}

for(const biome of ['sabana','desierto','gran-rio','volcanes','manglares','gran-canon'])test(`prepared native addition matches canonical geometry, six profiles and seam routes in ${biome}`,()=>{
 const a=fixture(biome),b=fixture(biome),before=profiles(a),resident=a.core.captureResidentChunks(),selected=a.core.currentChunk(),ta=stage(a),tb=stage(b,false);
 assert.deepEqual(profiles(a),before,'preparing must not commit or revise any live graph');assert.deepEqual(a.core.captureResidentChunks(),resident);assert.deepEqual(a.core.currentChunk(),selected);assert.equal(a.w.spatial_has_chunk(0,0),0);
 const preview=a.core.captureNativeWorldProposalResources(boundary(ta));assert.equal(commit(a,ta),1);assert.equal(commit(b,tb),1);
 assert.equal(a.w.spatial_world_proposal_resource_release(ta[0],ta[1]),1);assert.equal(a.w.spatial_world_resource_prepared_snapshot(ta[0],ta[1]),1,'committed resource ownership survives releasing the proposal');
 assert.equal(b.w.spatial_world_resource_prepared_snapshot(tb[0],tb[1]),0);
 const selects=a.selects,actual=a.core.captureNativeWorldResources(boundary(ta));assert.equal(a.selects,selects,'projection must not reselect or regenerate a chunk');
 assert.deepEqual(actual.chunks,preview.chunks);assert.deepEqual(actual.chunks,b.core.captureNativeWorldResources(boundary(tb)).chunks);
 assert.deepEqual(profiles(a),profiles(b),'tile commits preserve canonical profile revisions and sector counts');assert.deepEqual(grid(a),grid(b));assert.deepEqual(routes(a),routes(b));
 a.core.selectChunk(-1,0);const current=a.core.currentChunk();assert.deepEqual(a.core.captureNativeWorldResources(boundary(ta)).chunks,actual.chunks);assert.deepEqual(a.core.currentChunk(),current);
 actual.chunks[0].terrain.positions[1]+=123;assert.deepEqual(a.core.captureNativeWorldResources(boundary(ta)).chunks,preview.chunks,'exported arrays never alias native preparation storage');
});

test('a changed graph revision invalidates prepared sectors even when world input revisions are unchanged',()=>{
 const f=fixture(),t=stage(f),before=f.core.captureResidentChunks();f.w.spatial_select_nav_profile_index(0);assert.equal(f.w.lazy_reject_route_edge(-40,0,-39,0),1);
 assert.equal(f.w.spatial_world_proposal_resource_snapshot(t[0],t[1]),-1);assert.equal(commit(f,t),-2);assert.deepEqual(f.core.captureResidentChunks(),before);assert.equal(f.w.spatial_has_chunk(0,0),0);
});
test('a changed profile radius invalidates preparation before committing residence',()=>{
 const f=fixture(),t=stage(f);assert(f.w.spatial_build_nav_profile(2,.45,0)>0);assert.equal(f.w.spatial_world_proposal_resource_snapshot(t[0],t[1]),-1);assert.equal(commit(f,t),-2);assert.equal(f.w.spatial_has_chunk(0,0),0);
});
test('cached committed resource buffers reject a later physical world revision',()=>{
 const f=fixture(),t=stage(f);assert.equal(commit(f,t),1);assert.equal(f.w.spatial_world_resource_prepared_snapshot(t[0],t[1]),1);assert(f.core.addWall(60,60,.3,.3)>0);assert.equal(f.w.spatial_world_resource_prepared_snapshot(t[0],t[1]),-1);assert.throws(()=>f.core.captureNativeWorldResources(boundary(t)),/stale/);
});
