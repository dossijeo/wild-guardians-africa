import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
import {addSpatialWall,addSpatialWallsBatch} from '../../src/world/wild-engine/spatial-wall-bridge.js';

const module=new WebAssembly.Module(readFileSync('src/world/wild-engine/spatial-savanna.wasm'));
const walls=Array.from({length:40},(_,i)=>({kind:'wall',status:'intact',material:i%2?'adobe':'piedra',
  x:-20+i,z:Math.sin(i*.2)*2,yaw:Math.sin(i*.13)*.5,baseScaleX:1}));
const rows=[];
for(const seed of [712,28,123])for(const mode of ['single','batch','batch','single']){
  const core=createSpatialWorld(module);
  core.generate(seed,0,0);core.buildNavigation(.28,true);core.buildNavigation(1.1,false);
  const before=core.metrics().sectorUpdates,started=performance.now();
  const ids=mode==='batch'?addSpatialWallsBatch(core,walls):walls.map(wall=>addSpatialWall(core,wall));
  const editMs=performance.now()-started;
  if(ids.length!==walls.length||ids.some((id,index)=>id!==index+1))throw Error('Wall identifiers diverged');
  rows.push({seed,mode,editMs,sectorUpdates:core.metrics().sectorUpdates-before,
    snapshot:core.snapshot().barriers,memoryBytes:core.metrics().memoryBytes});
}
for(const seed of [712,28,123]){
  const group=rows.filter(row=>row.seed===seed);
  for(const row of group)if(JSON.stringify(row.snapshot)!==JSON.stringify(group[0].snapshot))
    throw Error(`Rotated wall state diverged at seed ${seed}`);
}
const report={scope:'ABBA placement of 40 rotated wall modules in one C++ Sabana chunk after two profiles are built. Isolated topology-edit timings; no rendering or gameplay.',
  rows:rows.map(({snapshot,...row})=>row)};
const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-oriented-walls-abba.json';
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.rows));
