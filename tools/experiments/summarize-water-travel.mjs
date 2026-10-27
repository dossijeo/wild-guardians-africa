import fs from 'node:fs/promises';
const root=process.argv[2]??'docs/qa/mangrove-magic-20261026/water-travel-abab';
const stats=a=>{const s=[...a].sort((a,b)=>a-b),p=q=>s[Math.min(s.length-1,Math.floor(s.length*q))];return {count:s.length,mean:s.reduce((a,b)=>a+b,0)/s.length,p50:p(.5),p95:p(.95),p99:p(.99),max:s.at(-1)};};
const rows=[];
for(let i=0;i<4;i++){
 const dir=`${root}/${i}-${i%2}`,read=async name=>JSON.parse(await fs.readFile(dir+'/'+name+'.json'));
 const [report,motion,gpu]=await Promise.all(['report','motion','gpu'].map(read));
 if(report.errors.length||gpu.disjoint||!gpu.supported||gpu.gpu.length!==240)throw Error('Invalid run '+i);
 rows.push({run:i,candidate:!!(i%2),renderer:gpu.renderer,seed:report.data.seed,camera:report.data.camera,geometry:report.data.farGround,motion:{frames:motion.frames,p50:motion.p50,p95:motion.p95,p99:motion.p99,max:motion.max,queuePeak:Math.max(...motion.samples.map(s=>s.chunkQueue)),lastSample:motion.samples.at(-1)},gpu:stats(gpu.gpu),cpuSubmission:stats(gpu.cpu),presentation:stats(gpu.intervals),memory:gpu.memory,render:gpu.render});
}
if(rows.some(r=>r.renderer!==rows[0].renderer||r.seed!==rows[0].seed||JSON.stringify(r.camera)!==JSON.stringify(rows[0].camera)))throw Error('Conditions differ');
const result={scope:'Paused simulation. Motion: 24s, 144m out/back plus camera elevation change. GPU: after return and preparation drain, 60 warmup/240 samples. CPU is submission time, not GPU execution. Geometry resource counts are not memory bytes.',rows};
await fs.writeFile(root+'/summary.json',JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
