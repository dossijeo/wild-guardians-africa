import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import assert from 'node:assert/strict';
const paths=['src/world/wild-engine/spatial-savanna.wasm','tools/experiments/spatial-profile.wasm'];
const modules=await Promise.all(paths.map(async p=>WebAssembly.compile(await readFile(p))));
const instantiate=module=>{
 let w;
 w=new WebAssembly.Instance(module,{env:{emscripten_notify_memory_growth(){}},wasi_snapshot_preview1:{proc_exit(code){throw Error(`exit ${code}`);},clock_time_get(_id,_precision,p){new DataView(w.memory.buffer).setBigUint64(p,BigInt(Math.round(performance.now()*1e6)),true);return 0;}}}).exports;
 return w;
};
const digest=(w,p,size)=>createHash('sha256').update(new Uint8Array(w.memory.buffer,p,size)).digest('hex');
const snapshot=w=>({heights:digest(w,w.spatial_heights_ptr(),49*49*4),colors:digest(w,w.spatial_colors_ptr(),49*49*12),groundMask:digest(w,w.spatial_ground_mask_ptr(),35*35*4),water:digest(w,w.spatial_water_ptr(),48*48),waterLevels:digest(w,w.spatial_water_levels_ptr(),48*48*4),waterTriangles:digest(w,w.spatial_water_triangles_ptr(),w.spatial_water_vertex_count()*12),props:digest(w,w.spatial_props_ptr(),w.spatial_prop_count()*40)});
const rows=[];
for(let biome=0;biome<6;biome++){
 const results=modules.map(module=>{
  const w=instantiate(module);w.spatial_generate_biome(712,biome,0,0);w.spatial_build_nav_profile(1,.28,1);w.spatial_build_nav_profile(0,.45,0);
  const captures=[];
  for(const [cx,cz] of [[1,0],[1,1],[-1,0]]){w.spatial_add_chunk(cx,cz);captures.push(snapshot(w));}
  w.spatial_select_chunk(0,0);captures.push(snapshot(w));
  return captures;
 });
 assert.deepEqual(results[1],results[0],`instrumentation changed biome ${biome}`);
 rows.push({biome,equal:true,snapshots:results[0]});
}
await mkdir('docs/qa/wild-engine-pthreads',{recursive:true});
await writeFile('docs/qa/wild-engine-pthreads/profile-equivalence.json',JSON.stringify({scope:'Visual payload byte hashes across six biomes and four selections, current production WASM versus profiled rebuild; not a proof of complete navigation or simulation equivalence.',rows},null,2)+'\n');
console.log('All six biome payload comparisons match.');
