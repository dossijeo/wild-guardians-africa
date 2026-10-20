import {readdir,readFile,writeFile} from 'node:fs/promises';
import sharp from 'sharp';
const root=process.argv[2]??'docs/qa/webgpu-evaluation/results';
const files=(await readdir(root)).filter(f=>/-(?:legacy|webgpu|webgl-tsl)-\d+-[01]\.json$/.test(f));
const stat=xs=>{const s=[...xs].sort((a,b)=>a-b);return {n:s.length,mean:s.reduce((a,b)=>a+b,0)/s.length,p50:s[Math.floor((s.length-1)*.5)],p95:s[Math.floor((s.length-1)*.95)],min:s[0],max:s.at(-1)}};
const rows=[];
for(const file of files){
 const r=JSON.parse(await readFile(`${root}/${file}`,'utf8'));
 rows.push({file,scenario:r.scenario,backend:r.backend,run:r.run,night:r.options.night,
  gpuMs:stat(r.timed.filter(s=>s.gpu.valid).map(s=>s.gpu.ms)),zeroGpuSamples:r.timed.filter(s=>s.gpu.valid&&s.gpu.ms===0).length,
  cpuSerializedMs:stat(r.timed.map(s=>s.cpuMs)),cpuInteractiveMs:stat(r.interactive.map(s=>s.cpuMs)),
  updateMs:stat(r.interactive.map(s=>s.updateMs)),intervalMs:stat(r.interactive.map(s=>s.intervalMs)),
  drawCalls:[...new Set(r.interactive.map(s=>s.drawCalls))],triangles:[...new Set(r.interactive.map(s=>s.triangles))],
  counts:r.capture.counts,errors:r.errors.concat(r.consoleErrors)});
}
const parity=[];
for(const scenario of [...new Set(rows.map(r=>r.scenario))])for(const night of [0,1]){
 const candidates=rows.filter(r=>r.scenario===scenario&&r.night===night),gpu=candidates.find(r=>r.backend==='webgpu');
 if(!gpu)continue;
 for(const other of candidates.filter(r=>r.backend!=='webgpu'&&r.run===Math.min(...candidates.filter(x=>x.backend===r.backend).map(x=>x.run)))){
  const image=r=>`${root}/${r.scenario}-${r.backend}-${r.run}-${night?'night':'day'}.png`;
  const a=await sharp(image(other)).removeAlpha().raw().toBuffer({resolveWithObject:true});
  const b=await sharp(image(gpu)).removeAlpha().raw().toBuffer({resolveWithObject:true});
  if(a.data.length!==b.data.length)throw Error('Image size mismatch');
  let abs=0,sq=0,pixelsOver2=0,pixelsOver10=0,max=0;
  for(let i=0;i<a.data.length;i+=3){
   let pixel=0;
   for(let k=0;k<3;k++){const d=Math.abs(a.data[i+k]-b.data[i+k]);abs+=d;sq+=d*d;max=Math.max(max,d);pixel=Math.max(pixel,d)}
   if(pixel>2)pixelsOver2++;if(pixel>10)pixelsOver10++;
  }
  parity.push({scenario,night,reference:other.backend,candidate:'webgpu',mae:abs/a.data.length,rmse:Math.sqrt(sq/a.data.length),max,pixelsOver2,pixelsOver10,totalPixels:a.info.width*a.info.height,submittedCountsIdentical:other.counts.drawCalls===gpu.counts.drawCalls&&other.counts.triangles===gpu.counts.triangles,resourceCounts:{reference:other.counts,candidate:gpu.counts}});
  await sharp({create:{width:a.info.width*2,height:a.info.height,channels:3,background:'#111'}})
   .composite([{input:image(other),left:0,top:0},{input:image(gpu),left:a.info.width,top:0}])
   .webp({quality:92}).toFile(`${root}/${scenario}-${other.backend}-versus-webgpu-${night?'night':'day'}.webp`);
 }
}
await writeFile(`${root}/summary.json`,JSON.stringify({rows,parity},null,2));
console.log(JSON.stringify({rows:rows.map(r=>({scenario:r.scenario,backend:r.backend,run:r.run,night:r.night,gpu:r.gpuMs.mean,cpu:r.cpuInteractiveMs.mean,p95:r.intervalMs.p95,errors:r.errors.length})),parity},null,2));
