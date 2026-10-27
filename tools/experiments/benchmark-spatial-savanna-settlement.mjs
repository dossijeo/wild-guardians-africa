import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {createSpatialSavannaPrototype} from '../../src/world/wild-engine/spatial-savanna-adapter.js';

const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-savanna-settlement.json';
const binary=readFileSync('src/world/wild-engine/spatial-savanna.wasm');
const module=new WebAssembly.Module(binary);
const timed=fn=>{const start=performance.now();const value=fn();return {ms:performance.now()-start,value};};
const rows=[];
for(const seed of [712,28,28,712,712,28,28,712]){
  const core=createSpatialSavannaPrototype(module);
  const generation=timed(()=>core.generate(seed,0,0));
  const worker=timed(()=>core.buildNavigation(.28,true));
  const animal=timed(()=>core.buildNavigation(1.1,false));
  const before=core.metrics();
  const settlement=timed(()=>core.setSettlement(10,8,7,6));
  const after=core.metrics();
  const visual=timed(()=>({ground:core.geometry(),water:core.waterGeometry(),props:core.props(),mask:core.groundMask()}));
  const route=timed(()=>core.route({x:10,z:8},{x:18,z:8}));
  rows.push({seed,generationMs:generation.ms,workerGraphMs:worker.ms,animalGraphMs:animal.ms,
    settlementUpdateMs:settlement.ms,localSectorUpdates:after.sectorUpdates-before.sectorUpdates,
    visualReadMs:visual.ms,routeMs:route.ms,routeStatus:route.value.status,
    propCount:visual.value.props.length,wasmBytes:after.memoryBytes,
    geometryVertices:visual.value.ground.getAttribute('position').count,
    waterVertices:visual.value.water.getAttribute('position').count});
  visual.value.ground.dispose();visual.value.water.dispose();
}
const report={scope:'Isolated one-chunk C++/WASM settlement prototype. Includes two cold navigation profiles and a one-time local topology edit. Browser GPU upload, JS production instantiation and worker transfers are excluded.',binaryBytes:binary.byteLength,rows};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows.map(({seed,generationMs,workerGraphMs,animalGraphMs,settlementUpdateMs,localSectorUpdates,visualReadMs,routeMs,wasmBytes})=>({seed,generationMs,workerGraphMs,animalGraphMs,settlementUpdateMs,localSectorUpdates,visualReadMs,routeMs,wasmBytes}))));
