import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {createSpatialSavannaPrototype} from '../../src/world/wild-engine/spatial-savanna-adapter.js';

const beforePath=process.env.WG_QA_BASELINE_WASM;
if(!beforePath)throw Error('Set WG_QA_BASELINE_WASM to the previous spatial binary');
const currentPath='src/world/wild-engine/spatial-savanna.wasm';
const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-prop-removal-abba.json';
const binaries={before:readFileSync(beforePath),after:readFileSync(currentPath)};
const modules=Object.fromEntries(Object.entries(binaries).map(([key,bytes])=>[key,new WebAssembly.Module(bytes)]));
const rows=[];
for(const biome of ['savanna','desert'])for(const seed of [28,712]){
  let expected=null;
  for(const [order,variant] of ['before','after','after','before'].entries()){
    const core=createSpatialSavannaPrototype(modules[variant]);
    core.generate(seed,0,0,biome);core.addChunk(1,0);
    core.buildNavigation(.28,true);core.buildNavigation(1.1,false);
    core.selectChunk(0,0);
    const prop=core.props().find(p=>p.group<=5&&
      (p.slot<=3||(p.slot>=10&&p.slot<=12)||p.slot>=18));
    if(!prop)throw Error(`No solid prop for ${biome} seed ${seed}`);
    const before=core.metrics();
    const start=performance.now(),removed=core.removeProp(prop),operationMs=performance.now()-start;
    if(removed!==1)throw Error('Prop removal failed');
    const after=core.metrics();
    const result={biome,seed,order,variant,id:`${prop.group}:${prop.gx}:${prop.gz}`,
      operationMs,sectorUpdates:after.sectorUpdates-before.sectorUpdates,
      state:JSON.stringify(core.snapshot()),props:JSON.stringify(core.props())};
    if(expected&&result.state!==expected.state||expected&&result.props!==expected.props)
      throw Error(`Spatial state or visible props diverged: ${biome} ${seed}`);
    expected=result;
    rows.push({biome,seed,order,variant,id:result.id,operationMs,
      sectorUpdates:result.sectorUpdates});
  }
}
const med=values=>{const sorted=values.toSorted((a,b)=>a-b);return (sorted[(sorted.length-1)>>1]+sorted[sorted.length>>1])/2;};
const summary=Object.fromEntries(['before','after'].map(variant=>[
  variant,{medianMs:med(rows.filter(row=>row.variant===variant).map(row=>row.operationMs)),
    medianSectorUpdates:med(rows.filter(row=>row.variant===variant).map(row=>row.sectorUpdates))}
]));
const report={beforeSha256:createHash('sha256').update(binaries.before).digest('hex'),
  afterSha256:createHash('sha256').update(binaries.after).digest('hex'),rows,summary};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(summary));
