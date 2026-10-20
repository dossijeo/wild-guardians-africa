import {readFile,writeFile} from 'node:fs/promises';import sharp from 'sharp';
const root='docs/qa/global-visual-lab/desert-aerial-sand/edge-ablation';
const report=JSON.parse(await readFile(root+'/captures.json','utf8')),pairs=[];
for(const r of report.records){
 const base=report.records.find(a=>a.quality===r.quality&&a.phase===r.phase&&a.variant==='normal');
 for(let i=0;i<r.frames.length;i++){
  const name=String(i).padStart(4,'0'),ap=`${root}/${r.quality}-normal-${r.phase}/${name}.png`,bp=`${root}/${r.quality}-${r.variant}-${r.phase}/${name}.png`;
  const [a,b]=await Promise.all([sharp(ap).removeAlpha().raw().toBuffer(),sharp(bp).removeAlpha().raw().toBuffer()]);let sum=0,changed=0,max=0;
  for(let j=0;j<a.length;j+=3){let pixel=0;for(let k=0;k<3;k++){const d=Math.abs(a[j+k]-b[j+k]);sum+=d;max=Math.max(max,d);pixel=Math.max(pixel,d)}if(pixel)changed++}
  const matched=['camera','target','time','calls','triangles'].every(k=>JSON.stringify(base.frames[i][k])===JSON.stringify(r.frames[i][k]));
  pairs.push({quality:r.quality,phase:r.phase,variant:r.variant,view:report.views[i],matched,mae:sum/a.length,changed,max});
  if(r.quality==='media'&&i===0)await sharp(bp).webp({lossless:true}).toFile(`${root}/${r.variant}-${r.phase}-game.webp`);
 }
}
const errors=report.records.flatMap(r=>r.errors);
await writeFile(root+'/comparison.json',JSON.stringify({pairs,errors},null,2));
if(pairs.some(p=>!p.matched)||errors.length)throw Error('Ablation parity failed');
console.log(`${pairs.length} matching captures, no errors`);
