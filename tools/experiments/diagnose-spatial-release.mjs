import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {WORKER_SPATIAL_PROFILE,ANIMAL_SPATIAL_PROFILES} from '../../src/world/wild-engine/spatial-movement-profiles.js';
const module=new WebAssembly.Module(readFileSync(process.argv[2]??'.codex-tmp/spatial-release-profile.wasm'));
const phases=['populate','raster','commitSectors','neighborBorders','addTotal','setup','latticeAndRegistration','colors','waterLevels','groundMask','waterMesh','propsAndRegistration','sectorOverlayFill','sectorGraphCommit'];
const rows=[];
for(const selectedRemoved of [false,true,false,true]){
 let w;w=new WebAssembly.Instance(module,{env:{emscripten_notify_memory_growth(){}},wasi_snapshot_preview1:{proc_exit(c){throw Error('Exit '+c);},clock_time_get(_id,_precision,p){new DataView(w.memory.buffer).setBigUint64(p,BigInt(Math.round(performance.now()*1e6)),true);return 0;}}}).exports;
 w.spatial_generate_biome(712,8,0,0);
 for(const p of [WORKER_SPATIAL_PROFILE,...Object.values(ANIMAL_SPATIAL_PROFILES)])w.spatial_build_nav_profile(p.index,p.radius,+p.worker);
 for(let z=-2;z<=2;z++)for(let x=-2;x<=2;x++)if(x||z)w.spatial_add_chunk(x,z);
 const selected=selectedRemoved?[-2,0]:[0,0];w.spatial_select_chunk(...selected);
 const coords=Array.from({length:5},(_,i)=>[-2,i-2]),ptr=w.spatial_remove_chunks_ptr(coords.length);
 new Int32Array(w.memory.buffer,ptr,10).set(coords.flat());
 w.spatial_profile_reset();const at=performance.now(),removed=w.spatial_remove_chunks(5),cpuMs=performance.now()-at;
 if(removed!==5||w.spatial_chunk_count()!==20)throw Error('Residency mismatch');
 rows.push({selectedRemoved,selected,removed,cpuMs,phases:Object.fromEntries(phases.map((k,i)=>[k,w.spatial_profile_ms(i)]))});
}
const out=process.argv[3]??'docs/qa/residual-spikes-20261027/native-release-profile';mkdirSync(out,{recursive:true});
const report={scope:'Isolated Node WASM diagnosis, seed712 estuary,25chunks,six profiles, same five removals; alternating whether selected chunk is removed. No renderer, workers, dynamic world or gameplay frametime; not an optimization comparison.',rows};
writeFileSync(out+'/report.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report,null,2));
