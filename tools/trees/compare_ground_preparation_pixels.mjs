import {createRequire} from 'node:module';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
const {PNG}=createRequire(import.meta.url)(process.env.PNGJS_MODULE??'pngjs'),dir='.cache/ground-preparation-visual';
const load=async name=>{const bytes=await readFile(`${dir}/${name}.png`);return {image:PNG.sync.read(bytes),sha256:createHash('sha256').update(bytes).digest('hex')};};
const a=await load('ground-visual-control-a'),runs=[];
for(const name of ['ground-visual-control-b','ground-visual-warm']){
 const b=await load(name);if(a.image.width!==b.image.width||a.image.height!==b.image.height)throw Error('Image size mismatch');let changed=0,over8=0,max=0,sum=0;
 for(let i=0;i<a.image.data.length;i+=4){let delta=0;for(let c=0;c<3;c++)delta=Math.max(delta,Math.abs(a.image.data[i+c]-b.image.data[i+c]));if(delta){changed++;sum+=delta;max=Math.max(max,delta);if(delta>8)over8++;}}
 runs.push({candidate:name,width:a.image.width,height:a.image.height,changed,over8,max,sum,referenceSha256:a.sha256,candidateSha256:b.sha256});
}
const report={scope:'Independent real new-game loads, same seed and fixed state time after loading, then 60 manual visual frames. Synchronous canvas readback; loading, camera/actor phases and asynchronous streaming are not proven identical. Control variability is a bound on this comparison, not proof of exact equivalence.',runs};
await writeFile('docs/lighting/tree-near-retexture/performance/manglares-ground-preparation-pixel-variation.json',JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
