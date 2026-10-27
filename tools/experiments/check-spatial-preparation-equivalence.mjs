import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from '../../src/world/wild-engine/spatial-movement-profiles.js';

const files=['src/world/wild-engine/spatial-savanna.wasm','tools/experiments/spatial-profile.wasm'];
const modules=await Promise.all(files.map(async path=>WebAssembly.compile(await readFile(path))));
const profiles=[WORKER_SPATIAL_PROFILE,...Object.values(ANIMAL_SPATIAL_PROFILES)];
function instance(module){let w;w=new WebAssembly.Instance(module,{env:{emscripten_notify_memory_growth(){}},wasi_snapshot_preview1:{proc_exit(code){throw Error(`exit ${code}`);},clock_time_get(_id,_precision,p){new DataView(w.memory.buffer).setBigUint64(p,BigInt(Math.round(performance.now()*1e6)),true);return 0;}}}).exports;return w;}
function snapshot(w){
 const results=[];
 for(const profile of profiles){
  w.spatial_select_nav_profile_index(profile.index);
  const cells=[];
  // Include chunk and sector boundaries, missing terrain, blocked and open cells.
  for(let z=-26;z<=74;z++)for(let x=-26;x<=74;x++)cells.push(w.spatial_walkable(x,z),w.spatial_edge(x,z,x+1,z),w.spatial_edge(x,z,x,z+1));
  const routes=[];
  for(const [x,z,nx,nz] of [[0,0,40,0],[-10,-10,60,60],[24,24,23,24],[0,0,-25,0]]){
   const connected=w.lazy_connected(x,z,nx,nz),count=w.lazy_route(x,z,nx,nz);
   routes.push({connected,count,points:count>0?Array.from(new Int32Array(w.memory.buffer,w.lazy_route_ptr(),count*2)):[]});
  }
  results.push({profile:profile.index,cells:createHash('sha256').update(Uint8Array.from(cells)).digest('hex'),routes,revision:w.lazy_route_revision()});
 }
 return {chunks:w.spatial_chunk_count(),props:w.spatial_resident_prop_count(),results};
}
const rows=[];
for(let biome=0;biome<6;biome++){
 const worlds=modules.map(instance);
 for(const w of worlds){w.spatial_generate_biome(712,biome,0,0);w.spatial_add_chunk(1,0);w.spatial_add_chunk(1,1);for(const p of profiles)w.spatial_build_nav_profile(p.index,p.radius,+p.worker);}
 const stages=[];
 const compare=name=>{const values=worlds.map(snapshot);assert.deepEqual(values[1],values[0],`biome ${biome}, ${name}`);stages.push({name,reference:values[0]});};
 compare('initial');
 const barriers=worlds.map(w=>w.spatial_add_oriented_barrier(24,2,1,7,.35,0));compare('wall');
 worlds.forEach((w,i)=>w.spatial_remove_barrier(barriers[i]));compare('remove-wall');
 worlds.forEach(w=>w.spatial_set_settlement(16,10,5,6));compare('settlement');
 // Remove exactly the same authored prop in both worlds.
 worlds.forEach(w=>w.spatial_select_chunk(0,0));
 const w=worlds[0],count=w.spatial_prop_count(),prop=count?new Int32Array(w.memory.buffer,w.spatial_props_ptr(),10):null;
 if(prop){const [group,gx,gz]=[prop[7],prop[8],prop[9]];worlds.forEach(w=>w.spatial_remove_prop(group,gx,gz));compare('suppressed-prop');}
 worlds.forEach(w=>w.spatial_remove_chunk(1,0));compare('unloaded-neighbor');
 worlds.forEach(w=>w.spatial_add_chunk(1,0));compare('restored-neighbor');
 rows.push({biome,stages});console.log(`biome ${biome}: ${stages.length} mutation stages match`);
}
await mkdir('docs/qa/wild-engine-pthreads',{recursive:true});
await writeFile('docs/qa/wild-engine-pthreads/preparation-equivalence.json',JSON.stringify({scope:'Synchronous staged-raster refactor vs original production WASM: six profiles, six biomes, dense walkability/edge grids, selected routes and revisions under edits/unload/reload. Does not prove concurrent safety.',rows},null,2)+'\n');
