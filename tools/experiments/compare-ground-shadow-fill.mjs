import sharp from 'sharp';
import {readFile,writeFile} from 'node:fs/promises';
const root='docs/qa/global-visual-lab/ground-shadow-fill';
const {records}=JSON.parse(await readFile(`${root}/captures.json`));
const comparisons=[];
for(const a of records.filter(r=>r.variant==='0')){
 const b=records.find(r=>r.biome===a.biome&&r.view===a.view&&r.phase===a.phase&&r.variant!=='0');
 const x=await sharp(`${root}/${a.file}`).removeAlpha().raw().toBuffer(),y=await sharp(`${root}/${b.file}`).removeAlpha().raw().toBuffer();
 let changed=0,total=0,max=0;
 for(let i=0;i<x.length;i+=3){let d=Math.max(...[0,1,2].map(c=>Math.abs(x[i+c]-y[i+c])));if(d>3)changed++;max=Math.max(max,d);total+=d;}
 comparisons.push({biome:a.biome,view:a.view,phase:a.phase,changedOver3Percent:changed/(x.length/3)*100,meanMaxChannelDelta:total/(x.length/3),max,matchingCamera:JSON.stringify(a.camera)===JSON.stringify(b.camera)&&JSON.stringify(a.target)===JSON.stringify(b.target),matchingTime:a.time===b.time,resourcesEqual:['calls','triangles','textures','geometries'].every(k=>a[k]===b[k]),errors:[...a.errors,...b.errors]});
}
await writeFile(`${root}/pixel-comparison.json`,JSON.stringify(comparisons,null,2)+'\n');
console.log(comparisons);
