import {readFile,writeFile} from 'node:fs/promises';import sharp from 'sharp';
const base='docs/qa/global-visual-lab/desert-aerial-sand',before=base+'/settlement',after=base+'/dry-specular';
const [old,current]=await Promise.all([before,after].map(p=>readFile(p+'/captures.json','utf8').then(JSON.parse)));const rows=[];
for(const quality of ['media','baja'])for(const phase of ['day','night'])for(let i=0;i<3;i++){
 const view=old.views[i],a=old.records.find(r=>r.quality===quality&&r.phase===phase&&r.variant==='candidate'),b=current.records.find(r=>r.quality===quality&&r.phase===phase&&r.variant==='candidate');
 const matched=['camera','target','time','calls','triangles'].every(k=>JSON.stringify(a.frames[i][k])===JSON.stringify(b.frames[i][k]));
 const name=`${quality}-candidate-${phase}-${view}.webp`,ap=before+'/'+name,bp=after+'/'+name;
 const [aa,bb]=await Promise.all([ap,bp].map(p=>sharp(p).removeAlpha().raw().toBuffer()));let sum=0,max=0,changed=0;
 for(let j=0;j<aa.length;j+=3){let pixel=0;for(let k=0;k<3;k++){const d=Math.abs(aa[j+k]-bb[j+k]);sum+=d;max=Math.max(max,d);pixel=Math.max(pixel,d)}if(pixel)changed++}
 rows.push({quality,phase,view,matched,mae:sum/aa.length,max,changed});
 if(i===0)await sharp({create:{width:2560,height:720,channels:3,background:'#000'}}).composite([{input:ap,left:0,top:0},{input:bp,left:1280,top:0}]).webp({quality:92}).toFile(`${after}/${quality}-${phase}-revision.webp`);
}
await writeFile(after+'/revision.json',JSON.stringify({reference:'settlement normal-only',candidate:'dry-specular',rows},null,2));
console.log(JSON.stringify(rows,null,2));if(rows.some(r=>!r.matched))throw Error('Revision parity mismatch');
