import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const require=createRequire(import.meta.url),{PNG}=require(process.env.PNGJS_MODULE??'pngjs'),dir='.cache/structural-prewarm-visual',runs=[];
for(const sequence of [5,35,68]){
 const load=async label=>{const bytes=await readFile(`${dir}/${label}-${sequence}.png`);return {image:PNG.sync.read(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
 const a=await load('visual-centered-control');
 for(const label of ['visual-centered-control-b','visual-centered-warm']){
  const b=await load(label);if(a.image.width!==b.image.width||a.image.height!==b.image.height)throw Error('Image dimensions differ');
  const compare=(x0,y0,x1,y1)=>{let changed=0,over8=0,max=0,sum=0;for(let y=y0;y<y1;y++)for(let x=x0;x<x1;x++){const i=(y*a.image.width+x)*4;let d=0;for(let c=0;c<4;c++)d=Math.max(d,Math.abs(a.image.data[i+c]-b.image.data[i+c]));if(d){changed++;sum+=d;max=Math.max(max,d);if(d>8)over8++;}}return {pixels:(x1-x0)*(y1-y0),changed,over8,max,sum};};
  runs.push({sequence,reference:'visual-centered-control',candidate:label,referenceSha256:a.sha256,candidateSha256:b.sha256,full:compare(0,0,a.image.width,a.image.height),center:compare(400,180,850,520)});
 }
}
const result={scope:'Three separately loaded QA scenes; synchronous screenshots alter timing. Initial elapsed time and animation phases are not held identical. Pixel differences are compared against independent control variability and do not prove visual equivalence.',runs};
await writeFile('docs/lighting/tree-near-retexture/performance/mobility-structural-prewarm-pixel-variation.json',JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify(result));
