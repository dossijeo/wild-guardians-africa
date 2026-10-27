import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
const module=new WebAssembly.Module(await readFile('src/world/wild-engine/spatial-savanna.wasm'));
const rows=[];
for(const variant of [7,8,7,8]){
 const core=createSpatialWorld(module);core.generate(37,0,0,'mangrove',variant===8?{mangroveNetwork:true}:{mangroveChannels:true});
 core.addSettlement(60,0,14,12);core.addChunk(1,0);core.removeChunk(1,0);
 for(const [cx,cz] of [[2,0],[2,1],[3,1],[-2,2],[4,-2]]){
  const start=performance.now();core.addChunk(cx,cz);const ms=performance.now()-start;
  const payload=core.chunkPayload();rows.push({variant,cx,cz,ms,waterFloats:payload.water.length});core.removeChunk(cx,cz);
 }
}
await mkdir('docs/qa/mangrove-magic-20261026',{recursive:true});await writeFile('docs/qa/mangrove-magic-20261026/native-generation-abab.json',JSON.stringify({scope:'Node synchronous native generation CPU, no navigation profiles; not frame time or GPU. Execute without concurrent benchmarks.',rows},null,2));console.log(JSON.stringify(rows));
