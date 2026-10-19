import {readFile,writeFile,stat} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import sharp from 'sharp';
const out='docs/qa/global-visual-lab/workshop-art';
const report=JSON.parse(await readFile(`${out}/capture-report.json`));
// Normalize the first-run camera field; later captures already use cameraPose.
for(const r of report.records)if(Array.isArray(r.camera)){r.cameraPose=r.camera;r.camera=r.filename.includes('-medium-')?'medium':'close';}
await writeFile(`${out}/capture-report.json`,JSON.stringify(report,null,2)+'\n');
const groups=[];
for(const variant of ['0','village-repacked','village-art'])for(const camera of ['medium','close'])for(const phase of ['day','night']){
 const rows=report.records.filter(r=>r.variant===variant&&r.camera===camera&&r.phase===phase);
 const mean=k=>rows.reduce((sum,r)=>sum+r[k],0)/rows.length;
 groups.push({variant,camera,phase,samples:rows.length,gpuMs:mean('gpuMs'),cpuMs:mean('cpuMs'),drawCalls:rows.map(r=>r.drawCalls),triangles:rows.map(r=>r.triangles),memory:rows.map(r=>r.memory),sceneMaterials:rows.map(r=>r.sceneMaterials)});
}
const differences=[];
for(const camera of ['medium','close'])for(const phase of ['day','night']){
 const a=await sharp(`${out}/village-repacked-${camera}-${phase}.webp`).removeAlpha().raw().toBuffer();
 const b=await sharp(`${out}/village-art-${camera}-${phase}.webp`).removeAlpha().raw().toBuffer();
 const box=camera==='medium'?[470,235,400,365]:[180,50,1030,660];let total=0,sum=0,changed=0;
 for(let y=box[1];y<box[1]+box[3];y++)for(let x=box[0];x<box[0]+box[2];x++){
  let max=0;for(let c=0;c<3;c++){const d=Math.abs(a[(y*1280+x)*3+c]-b[(y*1280+x)*3+c]);sum+=d;max=Math.max(max,d);}total++;if(max>12)changed++;
 }
 differences.push({camera,phase,roi:box,meanAbsoluteRgb:sum/(total*3),pixelsOver12Percent:100*changed/total,interpretation:'Difference within fixed building ROI, not a quality score; compressed screenshot comparison.'});
}
const files={};for(const p of ['public/assets/visual-lab/mapu-0-color-art.webp','public/assets/visual-lab/mapu-0-color-repacked.webp','public/assets/visual-lab/mapu-0-repacked.bin'])files[p]={bytes:(await stat(p)).size,sha256:createHash('sha256').update(await readFile(p)).digest('hex')};
const audit=JSON.parse(await readFile(`${out}/art-audit.json`));
for(const [p,h]of Object.entries(audit.sourceHashes))if(createHash('sha256').update(await readFile(p)).digest('hex')!==h)throw Error(`Source changed: ${p}`);
const summary={order:report.records.filter(r=>r.camera==='medium'&&r.phase==='day').map(r=>r.variant),groups,differences,files,sourceHashesVerified:true,extraTextureStorageVsABytes:2048*2048*4*4/3,extraTextureStorageVsBBytes:0,note:'RGBA8 mip storage estimate, not measured VRAM/RSS. Both B/C retain the shared source atlas for other village units.'};
await writeFile(`${out}/summary.json`,JSON.stringify(summary,null,2)+'\n');
console.log(JSON.stringify(summary,null,2));
