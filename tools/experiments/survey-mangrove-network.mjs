import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {createSpatialWorld} from '../../src/world/wild-engine/spatial-world.js';
const out=process.env.WG_NETWORK_OUT??'docs/qa/mangrove-magic-20261026/network-before';
await mkdir(out,{recursive:true});
const module=new WebAssembly.Module(await readFile('src/world/wild-engine/spatial-savanna.wasm'));
const results=[];
for(const seed of [1,37,712,4096]){
 const core=createSpatialWorld(module);core.generate(seed,0,0,'mangrove',{mangroveChannels:true});core.addSettlement(60,0,14,12);
 const size=240,step=2,counts={water:0,mud:0,dry:0,outerWater:0,outerTotal:0},cells=[];
 for(let iz=0;iz<size;iz++)for(let ix=0;ix<size;ix++){
  const x=(ix-size/2)*step,z=(iz-size/2)*step,mask=core.wetlandMaskAnywhere(x,z),wet=core.fluidLevelAnywhere(x,z)>0;
  const kind=wet?'water':mask>.2?'mud':'dry';counts[kind]++;
  if(Math.abs(x)>100&&Math.abs(z)>100){counts.outerTotal++;counts.outerWater+=wet;}
  cells.push(`<rect x="${ix*3}" y="${iz*3}" width="3" height="3" fill="${wet?'#286a80':mask>.2?'#9e885a':'#657953'}"/>`);
 }
 await writeFile(`${out}/seed-${seed}.svg`,`<svg xmlns="http://www.w3.org/2000/svg" width="720" height="750" viewBox="0 0 720 750"><rect width="720" height="750" fill="#eee9d5"/><g>${cells.join('')}</g><text x="12" y="740" font-size="16">Native wetland mask — seed ${seed} — 480 × 480 m — water / mud / dry</text></svg>`);
 results.push({seed,...counts,waterFraction:counts.water/(size*size),outerWaterFraction:counts.outerWater/counts.outerTotal});
}
await writeFile(out+'/report.json',JSON.stringify({scope:'Authoritative WASM samples; map diagnostic, not a renderer screenshot. Mud is wetland mask >0.2 outside water, not final material classification.',results},null,2));console.log(JSON.stringify(results));
