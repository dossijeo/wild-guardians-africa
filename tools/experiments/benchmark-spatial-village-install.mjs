import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialWorld} from '../../src/world/hierarchical-wasm/spatial-world.js';
import {addSpatialVillageBuildings} from '../../src/world/hierarchical-wasm/spatial-village-bridge.js';
import {villageLayout} from '../../src/world/villages.js';

const module=new WebAssembly.Module(readFileSync('src/world/hierarchical-wasm/spatial-savanna.wasm'));
const villages=JSON.parse(readFileSync('public/content/villages.json'));
const rows=[];
for(const seed of [712,28,123])for(const payload of villages)
  for(const mode of ['before','after','after','before']){
    const core=createSpatialWorld(module),village={id:'village-1',
      buildings:villageLayout(payload,0,0)};
    const started=performance.now();
    core.generate(seed,0,0);core.setSettlement(0,0,40,40);
    const setupMs=performance.now()-started;
    const install=()=>{const at=performance.now();
      const ids=addSpatialVillageBuildings(core,village);
      return {buildingMs:performance.now()-at,count:ids.size};};
    const build=()=>{const at=performance.now();
      core.buildNavigation(.28,true);core.buildNavigation(1.1,false);
      return performance.now()-at;};
    let installed,graphMs;
    if(mode==='before'){installed=install();graphMs=build();}
    else{graphMs=build();installed=install();}
    rows.push({seed,culture:payload.id,mode,buildings:installed.count,
      setupMs,buildingMs:installed.buildingMs,graphMs,
      totalMs:performance.now()-started,sectorUpdates:core.metrics().sectorUpdates,
      memoryBytes:core.metrics().memoryBytes,snapshot:core.snapshot()});
  }
for(const seed of [712,28,123])for(const payload of villages){
  const group=rows.filter(row=>row.seed===seed&&row.culture===payload.id);
  for(const row of group)if(JSON.stringify(row.snapshot)!==JSON.stringify(group[0].snapshot))
    throw Error(`Village topology diverged at ${seed}/${payload.id}`);
}
const report={scope:'ABBA isolated loading order for authored village houses: install before or after constructing worker and animal graphs. Measures C++ chunk generation, settlement, building collisions and graph setup; excludes rendering and gameplay.',
  rows:rows.map(({snapshot,...row})=>row)};
const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-village-install-abba.json';
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
const average=mode=>{
  const group=rows.filter(row=>row.mode===mode);
  return {mode,count:group.length,totalMs:group.reduce((n,row)=>n+row.totalMs,0)/group.length,
    sectorUpdates:group.reduce((n,row)=>n+row.sectorUpdates,0)/group.length};
};
console.log(JSON.stringify([average('before'),average('after')]));
