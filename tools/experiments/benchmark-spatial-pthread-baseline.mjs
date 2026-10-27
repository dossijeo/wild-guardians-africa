import {chromium} from 'playwright';
import {mkdir,writeFile} from 'node:fs/promises';

const out=process.env.WG_THREAD_BASELINE_OUT??'docs/qa/wild-engine-pthreads/baseline';
await mkdir(out,{recursive:true});
const browser=await chromium.launch({channel:'chrome',headless:true});
try{
 const page=await browser.newPage({viewport:{width:1280,height:720}});
 await page.goto('http://127.0.0.1:5190/');
 const report=await page.evaluate(async()=>{
  const {ANIMAL_SPATIAL_PROFILES,WORKER_SPATIAL_PROFILE}=await import('/src/world/wild-engine/spatial-movement-profiles.js');
  const profiles=[WORKER_SPATIAL_PROFILE,...Object.values(ANIMAL_SPATIAL_PROFILES)];
  const module=await WebAssembly.compileStreaming(fetch('/tools/experiments/spatial-profile.wasm'));
  const names=['populate','raster','commitSectors','neighborBorders','addTotal','setup','latticeAndRegistration','colors','waterLevels','groundMask','waterMesh','propsAndRegistration','sectorOverlayFill','sectorGraphCommit'];
  const rows=[];
  for(let run=0;run<3;run++)for(let biome=0;biome<6;biome++){
   let w;
   w=new WebAssembly.Instance(module,{env:{emscripten_notify_memory_growth(){}},wasi_snapshot_preview1:{clock_time_get(_id,_precision,pointer){new DataView(w.memory.buffer).setBigUint64(pointer,BigInt(Math.round(performance.now()*1e6)),true);return 0;}}}).exports;
   w.spatial_generate_biome(712,biome,0,0);
   for(const p of profiles)w.spatial_build_nav_profile(p.index,p.radius,+p.worker);
   // Warm the same operations, then measure fresh consecutive chunks.
   w.spatial_add_chunk(1,0);
   for(let cx=2;cx<=9;cx++){
    await new Promise(requestAnimationFrame);
    w.spatial_profile_reset();const start=performance.now();
    const result=w.spatial_add_chunk(cx,0),cpuMs=performance.now()-start;
    const phases=Object.fromEntries(names.map((name,i)=>[name,w.spatial_profile_ms(i)]));
    const next=await new Promise(requestAnimationFrame);
    const mainThreadGapMs=next-start;
    w.spatial_profile_reset();const selectStart=performance.now();w.spatial_select_chunk(cx,0);
    rows.push({run,biome,cx,cz:0,result,cpuMs,mainThreadGapMs,phases,selectMs:performance.now()-selectStart,memoryBytes:w.memory.buffer.byteLength});
   }
  }
  return {scope:'Synchronous core attribution in Chrome; six navigation profiles, seed 712, three runs and eight fresh chunks per biome. No renderer, simulation loop, graphics installation or GPU timing; RAF gap is an isolated main-thread blocking witness, not gameplay frametime.',userAgent:navigator.userAgent,hardwareConcurrency:navigator.hardwareConcurrency,profiles,rows};
 });
 await writeFile(`${out}/phases.json`,JSON.stringify(report,null,2)+'\n');
 for(let biome=0;biome<6;biome++){
  const rows=report.rows.filter(r=>r.biome===biome),mean=k=>rows.reduce((s,r)=>s+(r.phases[k]??r[k]),0)/rows.length;
  console.log(JSON.stringify({biome,addMs:mean('cpuMs'),populate:mean('populate'),raster:mean('raster'),commit:mean('commitSectors'),borders:mean('neighborBorders'),selectMs:mean('selectMs')}));
 }
}finally{await browser.close();}
