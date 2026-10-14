import {readFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialWorld} from '../../src/world/hierarchical-wasm/spatial-world.js';

const module=new WebAssembly.Module(readFileSync(new URL('../../src/world/hierarchical-wasm/spatial-savanna.wasm',import.meta.url)));
const core=createSpatialWorld(module);
core.generate(712,0,0);
core.buildNavigation(.28,true);
const cases=[];
fixtureSearch:for(let z=-16;z<17;z++)for(let x=-16;x<12;x++){
  const a={x,z},b={x:x+4,z};
  if(core.route(a,b).status!=='found')continue;
  const start={x:x+.12,z:z+.12},end={x:x+4+.12,z:z+.12};
  if(core.localClear(start,a)&&core.localClear(end,b))cases.push({a,b,start,end});
  if(cases.length===64)break fixtureSearch;
}
if(cases.length<16)throw Error(`Only ${cases.length} valid continuous route fixtures`);
const rounds=100;
const measure=kind=>{
  const started=performance.now();let found=0;
  for(let pass=0;pass<rounds;pass++)for(const item of cases){
    const result=kind==='grid'?core.route(item.a,item.b):core.routeWorld(item.start,item.end);
    found+=result.status==='found';
  }
  return {ms:performance.now()-started,found};
};
measure('world');measure('grid');
const results={seed:712,biome:'savanna',profile:{radius:.28,worker:true},cases:cases.length,rounds,
  grid:measure('grid'),continuous:measure('world'),memoryBytes:core.metrics().memoryBytes};
if(results.grid.found!==results.continuous.found)throw Error('Continuous routing lost reachable fixtures');
console.log(JSON.stringify(results,null,2));
