import {execFileSync} from 'node:child_process';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {createSpatialSavannaPrototype} from '../../src/world/wild-engine/spatial-savanna-adapter.js';

const baseline='474875c2';
const path='src/world/wild-engine/spatial-savanna.wasm';
const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-raster-equivalence.json';
const before=new WebAssembly.Module(execFileSync('git',['show',`${baseline}:${path}`]));
const after=new WebAssembly.Module(readFileSync(path));
const checks=[];
for(const seed of [28,712])for(const {name,radius,worker} of [
  {name:'worker',radius:.28,worker:true},
  {name:'animal',radius:1.1,worker:false},
  {name:'large-animal',radius:1.55,worker:false},
]){
  const old=createSpatialSavannaPrototype(before),current=createSpatialSavannaPrototype(after);
  for(const core of [old,current]){
    core.generate(seed,0,0);
    for(const [cx,cz] of [[1,0],[0,1],[1,1]])core.addChunk(cx,cz);
    if(core.buildNavigation(radius,worker)!==64)throw Error('Missing sectors');
  }
  for(const topology of ['open','walled','reopened']){
    if(topology==='walled')for(const core of [old,current])core.addWall(23.5,0,.8,24);
    if(topology==='reopened')for(const core of [old,current])core.removeWall(1);
    let cells=0,edges=0;
    for(let z=-24;z<72;z++)for(let x=-24;x<72;x++){
      if(old.walkable(x,z)!==current.walkable(x,z))
        throw Error(`Cell mismatch: ${seed} ${name} ${topology} (${x},${z})`);
      cells++;
      for(const [dx,dz] of [[1,0],[0,1]]){
        if(old.edge(x,z,x+dx,z+dz)!==current.edge(x,z,x+dx,z+dz))
          throw Error(`Edge mismatch: ${seed} ${name} ${topology} (${x},${z}) + (${dx},${dz})`);
        edges++;
      }
    }
    checks.push({seed,profile:name,topology,cells,edges,matching:true});
  }
}
const report={baseline,scope:'Four resident Sabana chunks, three radii, two seeds and open/walled/reopened topology. Exhaustive passability and positive-axis edge equality after removing redundant endpoint and reciprocal sampling.',checks};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({cases:checks.length,cells:checks.reduce((sum,row)=>sum+row.cells,0),
  edges:checks.reduce((sum,row)=>sum+row.edges,0),matching:checks.every(row=>row.matching)}));
