import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {isDeepStrictEqual} from 'node:util';
import {createSpatialWorld} from '../../src/world/hierarchical-wasm/spatial-world.js';

const module=new WebAssembly.Module(readFileSync(new URL(
  '../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const core=createSpatialWorld(module);
core.generate(712,0,0,'savanna');
core.setSettlement(0,0,7,6);
core.buildNavigationProfile(0,1.1,false);
const points=Array.from({length:2048},(_,i)=>({
  x:-20+(i%64)*.625+.13,
  z:-20+Math.floor(i/64)*1.25+.29,
}));
const modes={scalar:()=>points.map(point=>core.componentsWorld(point)),
  batch:()=>core.componentsWorldBatch(points)};
if(!isDeepStrictEqual(modes.scalar(),modes.batch()))throw Error('Region results differ');
for(let i=0;i<3;i++){modes.scalar();modes.batch();}
const samples={scalar:[],batch:[]};
for(const order of ['scalar','batch','batch','scalar','batch','scalar','scalar','batch'])
  for(const mode of [order,order==='scalar'?'batch':'scalar']){
    const start=performance.now();modes[mode]();
    samples[mode].push(performance.now()-start);
  }
const median=values=>{
  const sorted=[...values].sort((a,b)=>a-b),middle=sorted.length/2;
  return (sorted[middle-1]+sorted[middle])/2;
};
const report={fixture:'Sabana seed 712, one resident 48m chunk, warthog radius 1.1m',
  positions:points.length,profile:'animal',
  comparison:'Identical world and result objects; alternating AB/BA after warm-up',
  unit:'milliseconds',samples,medianMs:{scalar:median(samples.scalar),batch:median(samples.batch)},
  scope:'Node query boundary only; excludes chunk generation, game selection and movement'};
const output=new URL('../../docs/qa/hierarchical-navigation/spatial-region-batch.json',import.meta.url);
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
process.stdout.write(JSON.stringify(report.medianMs)+'\n');
