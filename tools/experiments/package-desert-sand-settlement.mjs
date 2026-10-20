import {readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const root=process.env.WG_SAND_OUTPUT??'docs/qa/global-visual-lab/desert-aerial-sand/settlement';
const report=JSON.parse(await readFile(root+'/captures.json','utf8')),pairs=[];
for(const quality of ['media','baja'])for(const phase of ['day','night']){
 const a=report.records.find(r=>r.quality===quality&&r.phase===phase&&r.variant==='base');
 const b=report.records.find(r=>r.quality===quality&&r.phase===phase&&r.variant==='candidate');
 for(let i=0;i<report.views.length;i++){
  const ap=`${root}/${quality}-base-${phase}/${String(i).padStart(4,'0')}.png`,bp=`${root}/${quality}-candidate-${phase}/${String(i).padStart(4,'0')}.png`;
  const [aa,bb]=await Promise.all([sharp(ap).removeAlpha().raw().toBuffer(),sharp(bp).removeAlpha().raw().toBuffer()]);
  if(aa.length!==bb.length)throw Error('Image size mismatch');
  let sum=0,max=0,changed=0;
  for(let j=0;j<aa.length;j+=3){let pixel=0;for(let k=0;k<3;k++){const d=Math.abs(aa[j+k]-bb[j+k]);sum+=d;pixel=Math.max(pixel,d);max=Math.max(max,d)}if(pixel>0)changed++}
  const samePoseAndGeometry=['camera','target','time','calls','triangles'].every(k=>JSON.stringify(a.frames[i][k])===JSON.stringify(b.frames[i][k]));
  pairs.push({quality,phase,view:report.views[i],samePoseAndGeometry,base:a.frames[i],candidate:b.frames[i],mae:sum/aa.length,max,changed});
  for(const [variant,input]of [['base',ap],['candidate',bp]])await sharp(input).webp({lossless:true}).toFile(`${root}/${quality}-${variant}-${phase}-${report.views[i]}.webp`);
  await sharp({create:{width:2560,height:720,channels:3,background:'#000'}}).composite([{input:ap,left:0,top:0},{input:bp,left:1280,top:0}]).webp({quality:92}).toFile(`${root}/${quality}-${phase}-${report.views[i]}-comparison.webp`);
 }
}
const errors=report.records.flatMap(r=>r.errors);
await writeFile(root+'/comparison.json',JSON.stringify({pairs,errors},null,2));
if(errors.length||pairs.some(p=>!p.samePoseAndGeometry))throw Error('Capture parity failed');
console.log(`${pairs.length} matched scene pairs; no recorded errors`);
