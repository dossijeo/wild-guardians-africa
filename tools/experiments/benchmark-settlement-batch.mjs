import fs from 'node:fs/promises';
import assert from 'node:assert/strict';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
const module=new WebAssembly.Module(await fs.readFile('src/world/wild-engine/spatial-savanna.wasm'));
const {fittedSites:sites}=JSON.parse(await fs.readFile('docs/qa/mangrove-magic-20261026/building-pad-experiment/report.json','utf8'));
const rows=[];let reference;
for(const mode of ['A','B','A','B','A','B','A','B']){
 const c=createSpatialWorld(module);c.generate(4096,1,0,'mangrove',{mangroveNetwork:true});
 const start=performance.now();if(mode==='A')for(const s of sites)c.addSettlement(s.x,s.z,s.hx,s.hz);else c.applySettlements(sites);
 const ms=performance.now()-start;const data=c.chunkPayload();if(reference)assert.deepEqual(data,reference);else reference=structuredClone(data);
 rows.push({mode,ms,changed:c.changedChunks().length});
}
const report={scope:'Node native preparation only; one resident chunk, no active navigation. Not presentation frametime.',order:'ABABABAB',sites:sites.length,rows};
await fs.writeFile('docs/qa/mangrove-magic-20261026/building-pad-experiment/batch-benchmark.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report));
