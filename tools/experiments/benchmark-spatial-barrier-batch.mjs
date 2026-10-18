import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialSavannaPrototype} from '../../src/world/wild-engine/spatial-savanna-adapter.js';

const module=new WebAssembly.Module(readFileSync(new URL('../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const chain=Array.from({length:40},(_,i)=>({x:-20+i,z:0,halfX:.49,halfZ:.45,passMask:0}));
const rows=[];
for(const seed of [712,28,123])for(const mode of ['single','batch','batch','single']){
  const core=createSpatialSavannaPrototype(module);
  core.generate(seed,0,0);core.buildNavigation(.28,true);core.buildNavigation(1.1,false);
  const before=core.metrics().sectorUpdates,start=performance.now();
  const ids=mode==='batch'?core.addBarriersBatch(chain):
    chain.map(({x,z,halfX,halfZ,passMask})=>core.addBarrier(x,z,halfX,halfZ,passMask));
  const editMs=performance.now()-start;
  if(ids.length!==chain.length||ids.some((id,i)=>id!==i+1))throw Error('Barrier IDs differ');
  const sectorUpdates=core.metrics().sectorUpdates-before;
  const routes=[];
  for(const worker of [true,false]){
    core.selectNavigation(worker);
    routes.push(core.route({x:0,z:-3},{x:0,z:3}).status);
  }
  rows.push({seed,mode,editMs,sectorUpdates,routes,memoryBytes:core.metrics().memoryBytes});
}
for(const seed of [712,28,123]){
  const variants=rows.filter(row=>row.seed===seed);
  for(const row of variants)if(JSON.stringify(row.routes)!==JSON.stringify(variants[0].routes))
    throw Error(`Different route outcomes for seed ${seed}`);
}
const report={scope:'40 adjacent authorized barriers in one Sabana chunk, after building worker and animal graphs. ABBA order per seed; times cover occupancy update and both local graph refreshes, excluding startup and graph construction. Isolated Node/WASM, not gameplay.',rows};
if(process.argv[2])writeFileSync(process.argv[2],JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows));
