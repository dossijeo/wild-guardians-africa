import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {decodeRadiance} from '../../src/rendering/sky-source.js';
import {buildEnvironmentPixels} from '../../src/rendering/fluid-lighting-source.js';
import {buildGradedEnvironmentPixels} from './qa-sky-environment-palette-20261022.js';
const out='docs/qa/global-visual-lab/sky-environment-palette-20261022';await mkdir(out,{recursive:true});
const catalogue=JSON.parse(await readFile('public/content/skies.json','utf8'));const rows=[];
for(let index=0;index<2;index++){
 const data=decodeRadiance(await readFile('public'+catalogue.panoramas[index].url));
 const reference=buildGradedEnvironmentPixels(data,index,{cacheLatitude:false}).pixels,fast=buildGradedEnvironmentPixels(data,index).pixels;if(!Buffer.from(reference).equals(Buffer.from(fast)))throw Error('Latitude cache changed pixels');
 for(let run=0;run<8;run++)for(const variant of ['original','palette-reference','palette']){
  const start=performance.now(),result=(variant==='original'?buildEnvironmentPixels:buildGradedEnvironmentPixels)(data,index,{cacheLatitude:variant!=='palette-reference'}),ms=performance.now()-start;
  if(result.pixels.byteLength!==131072)throw Error('Unexpected environment size');
  rows.push({index,run,variant,ms,bytes:result.pixels.byteLength});
 }
}
await writeFile(out+'/build-cost.json',JSON.stringify({note:'Node CPU build only, original/reference/optimized alternation; exact byte equality asserted on both HDR assets, first run warmup, not GPU or loading latency.',rows},null,2));
for(let index=0;index<2;index++)for(const variant of ['original','palette-reference','palette']){const values=rows.filter(r=>r.index===index&&r.variant===variant&&r.run>0).map(r=>r.ms).sort((a,b)=>a-b);console.log(index,variant,values[Math.floor(values.length/2)]);}
