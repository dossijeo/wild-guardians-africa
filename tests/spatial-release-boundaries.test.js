import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from '../src/world/wild-engine/spatial-movement-profiles.js';
const module=new WebAssembly.Module(readFileSync(process.env.WG_RELEASE_WASM??new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const profiles=[WORKER_SPATIAL_PROFILE,...Object.values(ANIMAL_SPATIAL_PROFILES)];
function world(seed,biome){
 let w;w=new WebAssembly.Instance(module,{env:{emscripten_notify_memory_growth(){}},wasi_snapshot_preview1:{proc_exit(c){throw Error(`Native exit ${c}`);},clock_time_get(_id,_precision,p){new DataView(w.memory.buffer).setBigUint64(p,BigInt(Math.round(performance.now()*1e6)),true);return 0;}}}).exports;
 w.spatial_generate_biome(seed,biome,0,0);
 for(const p of profiles)w.spatial_build_nav_profile(p.index,p.radius,+p.worker);
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)if(x||z)w.spatial_add_chunk(x,z);
 // Obstacles straddle boundaries; worker-only portals use the actual pass mask.
 w.spatial_add_barrier(-24,0,1,8,0);w.spatial_add_barrier(0,-24,8,1,2);
 return w;
}
function equivalent(a,b,label){
 assert.equal(a.spatial_chunk_count(),b.spatial_chunk_count(),label);
 assert.equal(a.spatial_prop_count(),b.spatial_prop_count(),label+' visible count');
 assert.equal(a.spatial_halo_prop_count(),b.spatial_halo_prop_count(),label+' collision halo');
 for(const p of profiles){
  a.spatial_select_nav_profile_index(p.index);b.spatial_select_nav_profile_index(p.index);
  for(let z=-73;z<=73;z++)for(let x=-73;x<=73;x++)assert.equal(a.lazy_component(x,z),b.lazy_component(x,z),`${label} profile${p.index} cell${x},${z}`);
  for(let i=0;i<24;i++){
   const coords=[(i*17)%130-65,(i*31)%130-65,(i*43+9)%130-65,(i*59+3)%130-65];
   assert.equal(a.lazy_connected(...coords),b.lazy_connected(...coords),`${label} connectivity`);
   const ca=a.lazy_route(...coords),cb=b.lazy_route(...coords);assert.equal(ca,cb,`${label} route status`);
   if(ca>0)assert.deepEqual(new Int32Array(a.memory.buffer,a.lazy_route_ptr(),ca*2),new Int32Array(b.memory.buffer,b.lazy_route_ptr(),cb*2),`${label} physical route`);
  }
 }
 // Read deferred visual data after removal, without selecting/regenerating first.
 for(const [getter,bytes] of [['spatial_props_ptr',a.spatial_prop_count()*40],['spatial_heights_ptr',49*49*4],['spatial_colors_ptr',49*49*3*4],['spatial_water_ptr',48*48],['spatial_water_levels_ptr',48*48*4],['spatial_ground_mask_ptr',35*35*4]]){
  const pa=a[getter](),pb=b[getter]();assert.deepEqual(new Uint8Array(a.memory.buffer,pa,bytes),new Uint8Array(b.memory.buffer,pb,bytes),label+' '+getter);
 }
 const count=a.spatial_water_vertex_count();assert.equal(count,b.spatial_water_vertex_count());
 assert.deepEqual(new Float32Array(a.memory.buffer,a.spatial_water_triangles_ptr(),count*3),new Float32Array(b.memory.buffer,b.spatial_water_triangles_ptr(),count*3),label+' water mesh');
}
for(const biome of [0,1,2,3,8,5])test(`batch removal matches full sequential boundary rebuild, biome ${biome}`,()=>{
 const a=world(712,biome),b=world(712,biome);
 const remove=coords=>{const ptr=a.spatial_remove_chunks_ptr(coords.length);new Int32Array(a.memory.buffer,ptr,coords.length*2).set(coords.flat());const count=a.spatial_remove_chunks(coords.length);let expected=0;for(const c of coords)expected+=b.spatial_remove_chunk(...c);assert.equal(count,expected);};
 const corner=[[0,-1],[-1,0],[-1,-1],[-1,-1],[9,9]];
 remove(corner);equivalent(a,b,'corner and duplicate');
 for(const w of [a,b]){for(const c of corner.slice(0,3))w.spatial_add_chunk(...c);w.spatial_add_barrier(24,24,5,1,0);w.spatial_select_chunk(0,0);}
 remove([[0,0],[1,0],[1,1]]);equivalent(a,b,'selected chunk and changed obstacles');
});

test('prop removal before deferred payload read preserves replacement visuals',()=>{
 const a=world(712,8),b=world(712,8),coords=[];
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++)if(x!==1||z!==1)coords.push([x,z]);
 for(const w of [a,b])w.spatial_select_chunk(0,0);
 const ptr=a.spatial_remove_chunks_ptr(coords.length);new Int32Array(a.memory.buffer,ptr,coords.length*2).set(coords.flat());
 a.spatial_remove_chunks(coords.length);for(const c of coords)b.spatial_remove_chunk(...c);
 assert(a.spatial_prop_count()>0);
 const view=new DataView(a.memory.buffer,a.spatial_props_ptr(),40);
 const identity=[view.getInt32(28,true),view.getInt32(32,true),view.getInt32(36,true)];
 assert.equal(a.spatial_remove_prop(...identity),b.spatial_remove_prop(...identity));
 equivalent(a,b,'prop edit before visual read');
});
