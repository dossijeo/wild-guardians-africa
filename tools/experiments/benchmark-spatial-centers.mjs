import {readFileSync,writeFileSync} from 'node:fs';
import {performance} from 'node:perf_hooks';
import {createSpatialWorld} from '../../src/world/hierarchical-wasm/spatial-world.js';
import {addSpatialCenter,removeSpatialCenter} from '../../src/world/hierarchical-wasm/spatial-center-bridge.js';
import {centerFootprint} from '../../src/world/centers.js';

const module=new WebAssembly.Module(readFileSync('src/world/hierarchical-wasm/spatial-savanna.wasm'));
const rows=[];
for(const seed of [712,28,123])for(const culture of ['mapungubwe','saheliana','suajili','musgum','etiope']){
  const core=createSpatialWorld(module);
  core.generate(seed,0,0);core.setSettlement(10,8,13,13);
  core.buildNavigation(.28,true);core.buildNavigation(1.1,false);
  const center={kind:'center',status:'intact',culture,x:10,z:8,yaw:.47};
  const before=core.metrics().sectorUpdates,started=performance.now();
  const id=addSpatialCenter(core,center),addMs=performance.now()-started;
  const addUpdates=core.metrics().sectorUpdates-before;
  const saved=core.snapshot();
  const restore=createSpatialWorld(module);
  const restoreStart=performance.now();
  restore.restoreState(saved);restore.buildNavigation(.28,true);restore.buildNavigation(1.1,false);
  const restoreMs=performance.now()-restoreStart;
  if(JSON.stringify(restore.snapshot())!==JSON.stringify(saved))throw Error('Center reload diverged');
  const removeStart=performance.now();
  if(removeSpatialCenter(core,id)!==1)throw Error('Could not remove work center');
  rows.push({seed,culture,vertices:centerFootprint(center).footprint.length,
    addMs,addUpdates,restoreMs,removeMs:performance.now()-removeStart,
    removeUpdates:core.metrics().sectorUpdates-before-addUpdates,
    memoryBytes:core.metrics().memoryBytes});
}
const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-centers.json';
const report={scope:'Isolated exact authored center polygon placement/removal and fresh snapshot reload after worker and animal graph construction. Does not measure game rendering or full load.',rows};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows));
