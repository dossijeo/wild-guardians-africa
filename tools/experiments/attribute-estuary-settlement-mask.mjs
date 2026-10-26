import fs from 'node:fs/promises';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
const module=new WebAssembly.Module(await fs.readFile('src/world/wild-engine/spatial-savanna.wasm'));
const natural=createSpatialWorld(module),settled=createSpatialWorld(module);
for(const core of [natural,settled])core.generate(4096,0,0,'mangrove',{mangroveNetwork:true});
settled.addSettlement(60,0,14,12);
const rows=[];let removed=0,changedOutside=0;
for(let z=-32;z<=32;z+=.5)for(let x=28;x<=92;x+=.5){const a=natural.wetlandMaskAnywhere(x,z),b=settled.wetlandMaskAnywhere(x,z);if(a>.61&&b<=.61)removed++;if(a!==b&&(Math.abs(x-60)>=20||Math.abs(z)>=18))changedOutside++;rows.push({x,z,natural:a,settled:b});}
const path='docs/qa/mangrove-magic-20261026/settlement-water-attribution';await fs.mkdir(path,{recursive:true});
const report={seed:4096,settlement:{x:60,z:0,hx:14,hz:12,falloff:6},samples:rows.length,removedWetSamples:removed,changedOutsideSupport:changedOutside,scope:'Controlled native comparison; confirms rectangular settlement mask support, not attribution of every visible shoreline corner or regional raster error.'};
await fs.writeFile(path+'/report.json',JSON.stringify(report,null,2));console.log(report);
