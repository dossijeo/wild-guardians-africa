import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {Navigation} from '../../src/world/navigation.js';
import {groundColor} from '../../src/rendering/terrain-source.js';
import {createSpatialSavannaPrototype} from '../../src/world/hierarchical-wasm/spatial-savanna-adapter.js';

const output=process.argv[2]??'docs/qa/hierarchical-navigation/spatial-savanna-ground-measurements.json';
const profile=JSON.parse(readFileSync('public/content/biome-savanna.json','utf8')).profile;
const module=new WebAssembly.Module(readFileSync('src/world/hierarchical-wasm/spatial-savanna.wasm'));
function summary(values){
  const sorted=[...values].sort((a,b)=>a-b),mean=values.reduce((a,b)=>a+b,0)/values.length;
  return {min:sorted[0],p5:sorted[Math.floor(sorted.length*.05)],median:sorted[Math.floor(sorted.length*.5)],
    p95:sorted[Math.floor(sorted.length*.95)],max:sorted.at(-1),mean,
    standardDeviation:Math.sqrt(values.reduce((a,b)=>a+(b-mean)**2,0)/values.length)};
}
const rows=[];
for(const seed of [712,28]){
  const nav=new Navigation(String(seed),'sabana',profile);
  const core=createSpatialSavannaPrototype(module);core.generate(seed,0,0);
  const jsHeights=[],wasmHeights=[],jsLight=[],wasmLight=[],jsSlope=[],wasmSlope=[];
  const heights=core.heights(),colors=core.colors();
  for(let z=0;z<49;z++)for(let x=0;x<49;x++){
    const wx=x-24,wz=z-24,i=z*49+x;
    jsHeights.push(nav.field.lattice(wx,wz));wasmHeights.push(heights[i]);
    const color=groundColor(nav.field,profile,wx,wz);
    jsLight.push(color[0]*.2126+color[1]*.7152+color[2]*.0722);
    wasmLight.push(colors[i*3]*.2126+colors[i*3+1]*.7152+colors[i*3+2]*.0722);
    if(x<48&&z<48){
      jsSlope.push(Math.hypot(nav.field.lattice(wx+1,wz)-nav.field.lattice(wx,wz),
        nav.field.lattice(wx,wz+1)-nav.field.lattice(wx,wz)));
      wasmSlope.push(Math.hypot(heights[i+1]-heights[i],heights[i+49]-heights[i]));
    }
  }
  rows.push({seed,js:{height:summary(jsHeights),slope:summary(jsSlope),luminance:summary(jsLight)},
    wasm:{height:summary(wasmHeights),slope:summary(wasmSlope),luminance:summary(wasmLight)}});
}
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify({scope:'Sabana seed-local 49x49 terrain-grid comparison; geometry recipes intentionally differ.',rows},null,2)+'\n');
console.log(JSON.stringify(rows));
