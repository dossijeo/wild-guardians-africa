import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {addSpatialWallsBatch,addSpatialGate,spatialGateBarriers} from '../../src/world/wild-engine/spatial-wall-bridge.js';

const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
const walls=Array.from({length:24},(_,i)=>({kind:'wall',status:'intact',
  id:`wall-${i}`,material:i%2?'adobe':'zarzas',x:-17+(i%8)*4.4,
  z:-13+Math.floor(i/8)*8,yaw:Math.sin(i*.17)*.17,baseScaleX:1}));
const rows=[];
for(const seed of [712,28,123])for(const mode of ['single','atomic','atomic','single']){
  const core=createSpatialWorld(module);
  core.generate(seed,0,0);core.buildNavigation(.28,true);core.buildNavigation(1.1,false);
  const oldIds=addSpatialWallsBatch(core,walls);
  const before=core.metrics().sectorUpdates,started=performance.now();
  if(mode==='single')walls.forEach((wall,index)=>{
    core.removeBarrier(oldIds[index]);addSpatialGate(core,{...wall,gate:true});
  });
  else core.applyBarrierChanges(oldIds,walls.flatMap(wall=>spatialGateBarriers({...wall,gate:true})));
  rows.push({seed,mode,editMs:performance.now()-started,
    sectorUpdates:core.metrics().sectorUpdates-before,
    memoryBytes:core.metrics().memoryBytes,snapshot:core.snapshot()});
}
for(const seed of [712,28,123]){
  const group=rows.filter(row=>row.seed===seed);
  for(const row of group)if(JSON.stringify(row.snapshot)!==JSON.stringify(group[0].snapshot))
    throw Error(`Gate topology diverged at seed ${seed}`);
}
const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-gate-conversion-abba.json';
const report={scope:'ABBA conversion of 24 authored walls to automatic gates in one Sabana chunk with worker and animal profiles. Measures only spatial topology edits, not rendering or gameplay.',
  rows:rows.map(({snapshot,...row})=>row)};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.rows));
