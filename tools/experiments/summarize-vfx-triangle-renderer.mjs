import fs from 'node:fs/promises';
const root='docs/qa/mangrove-magic-20261026/vfx-triangle-candidate';
const prefix=process.argv[2]??'renderer';const rows=[];
for(const [index,mode] of ['A','B','A','B'].entries()){
 const path=`${root}/${prefix}-${index+1}-${mode}`,r=JSON.parse(await fs.readFile(path+'/raid-ui.json')),w=JSON.parse(await fs.readFile(path+'/program-waits.json'));
 const values=r.timing.frames.map(f=>f.ms).sort((a,b)=>a-b),q=p=>values[Math.ceil(values.length*p)-1];
 rows.push({index:index+1,mode,biome:r.biome,ok:r.ok,candidateLoads:r.vfxCandidateLoads??0,cpuSampling:r.cpuSampling??true,frames:values.length,p50:q(.5),p95:q(.95),p99:q(.99),max:values.at(-1),programQueries:w.length,clickRoundtripMs:r.clickEnd-r.clickStart,errors:r.errors});
}
const report={scope:'Same raid fixture, medium 1280x720, 12s after shield, CPU sampling status recorded per run. Frame intervals are not GPU execution. Click roundtrip includes automation. Independent live simulations are not pixel-identical temporal samples.',rows};
await fs.writeFile(root+'/'+prefix+'-summary.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
