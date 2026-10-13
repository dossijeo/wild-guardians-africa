import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {performance} from 'node:perf_hooks';
import {createSpatialSavannaPrototype} from '../../src/world/hierarchical-wasm/spatial-savanna-adapter.js';
import {nativeTerrainBuffer} from '../../src/rendering/terrain-geometry.js';
import {nativeWaterBuffer} from '../../src/rendering/water-geometry.js';
import {chunkTransferables} from '../../src/rendering/chunk-data.js';

const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-chunk-payload.json';
const module=new WebAssembly.Module(readFileSync('src/world/hierarchical-wasm/spatial-savanna.wasm'));
const timed=fn=>{const start=performance.now(),value=fn();return {ms:performance.now()-start,value};};
const rows=[];
for(const seed of [712,28,28,712,712,28,28,712]){
  const core=createSpatialSavannaPrototype(module);
  const spatial=timed(()=>{
    core.generate(seed,0,0);
    core.setSettlement(10,8,7,6);
    core.buildNavigation(.28,true);core.buildNavigation(1.1,false);
  });
  const payload=timed(()=>core.chunkPayload());
  const transfer=chunkTransferables(payload.value);
  const bytes=transfer.reduce((sum,buffer)=>sum+buffer.byteLength,0);
  const cloned=timed(()=>structuredClone(payload.value,{transfer}));
  const render=timed(()=>({ground:nativeTerrainBuffer(cloned.value.terrain),
    water:nativeWaterBuffer(cloned.value.water)}));
  rows.push({seed,spatialMs:spatial.ms,payloadMs:payload.ms,transferMs:cloned.ms,
    rendererGeometryMs:render.ms,transferBytes:bytes,memoryBytes:core.metrics().memoryBytes,
    terrainVertices:render.value.ground.getAttribute('position').count,
    propCount:cloned.value.instances.reduce((count,slot)=>count+slot.length,0)});
  render.value.ground.dispose();render.value.water?.dispose();
}
const report={scope:'One Sabana settlement chunk, two cold navigation graphs, compact render payload, structured-clone transfer and production geometry constructors. Node desktop only; excludes real Web Worker messaging, assets, material upload and game simulation.',rows};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(rows));
