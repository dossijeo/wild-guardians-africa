import fs from 'node:fs';
const root=process.env.BENCH_OUT??'docs/lighting/tree-near-retexture/performance',rows=[];
for(const name of ['sabana','gran-rio','manglares','volcanes','gran-canon']){
 const file=`${root}/${name}.json`;if(!fs.existsSync(file))continue;
 const data=JSON.parse(fs.readFileSync(file));
 for(const view of ['overview','near']){
  const blocks=data.records.filter(r=>r.view===view);if(blocks.length!==4)continue;
  if(JSON.stringify(blocks.map(r=>r.enabled))!=='[false,true,true,false]')throw Error('Invalid ABBA ordering');
  const reference=blocks[0].report;
  if(view==='near'&&blocks.some(b=>b.enabled&&b.populations.nearInstances<1))throw Error('Near view does not exercise improved textures');
  for(const b of blocks){
   const r=b.report;
   if(!r.cameraStable||!r.simulationUnchanged||r.device.hiddenDuringRun||r.errors.length)throw Error('Invalid benchmark conditions');
   if(JSON.stringify(r.scenario.camera)!==JSON.stringify(reference.scenario.camera)||JSON.stringify(r.scenario.target)!==JSON.stringify(reference.scenario.target)||JSON.stringify(r.device.canvas)!==JSON.stringify(reference.device.canvas))throw Error('Camera or framebuffer changed between blocks');
  }
  const metrics={};
  for(const key of ['cpuSubmissionMs','gpuElapsedMs','frameIntervalMs','submittedCalls','submittedTriangles']){
   const summarize=enabled=>{const samples=blocks.filter(b=>b.enabled===enabled).map(b=>b.report[key]);if(samples.some(s=>!s?.count))return null;return {mean:samples.reduce((n,s)=>n+s.mean*s.count,0)/samples.reduce((n,s)=>n+s.count,0),blockMeans:samples.map(s=>s.mean),blockP95:samples.map(s=>s.p95)};};
   const original=summarize(false),near=summarize(true);
   metrics[key]={original,near,delta:original&&near?near.mean-original.mean:null,percent:original&&near?100*(near.mean/original.mean-1):null};
  }
  rows.push({biome:name,view,nearInstances:blocks.filter(b=>b.enabled).map(b=>b.populations.nearInstances),farAttached:blocks.every(b=>b.populations.farAttached),metrics});
 }
}
fs.writeFileSync(`${root}/summary.json`,JSON.stringify({complete:rows.length===10,scope:'Weighted mean across the two blocks per condition; p95 values are individual block percentiles, never averaged. Static isolated fixture, not live combat. farAttached explicitly records whether impostors participate.',rows},null,2)+'\n');
for(const r of rows)console.log(r.biome,r.view,'CPU',r.metrics.cpuSubmissionMs.percent?.toFixed(1)+'%','GPU',r.metrics.gpuElapsedMs.percent?.toFixed(1)+'%','far',r.farAttached);
