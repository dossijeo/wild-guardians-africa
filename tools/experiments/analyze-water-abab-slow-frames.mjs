import fs from 'node:fs';
const root=process.argv[2]??'docs/qa/residual-spikes-20261027/integrated-water-abab';
const reports=[];
for(const dir of ['1-baseline','2-candidate','3-baseline','4-candidate']){
 const r=JSON.parse(fs.readFileSync(`${root}/${dir}/raid-ui.json`)),start=r.casts[0].start,end=start+40000,gpu=new Map(r.residual.gpu.samples.map(x=>[x.frame,x.ms]));
 const slow=r.timing.frames.filter(x=>x.t-x.ms>=start&&x.t<=end&&x.ms>100).map(f=>{
  const a=f.t-f.ms,b=f.t,overlap=(x,y)=>x<b&&y>a;
  const cpu=r.residual.cpu.filter(x=>overlap(x.at,x.at+x.ms));
  const spans=r.regionalTail.rows.filter(x=>x.scope.startsWith('Synchronous')&&overlap(x.start,x.start+x.duration));
  const loaf=r.wholeFrame.longFrames.filter(x=>overlap(x.startTime,x.startTime+x.duration));
  return {start:a,end:b,intervalMs:f.ms,renderCpuMaxMs:Math.max(0,...cpu.map(x=>x.ms)),associatedGpuMaxMs:Math.max(0,...cpu.map(x=>gpu.get(x.frame)??0)),synchronousSpanMaxMs:Math.max(0,...spans.map(x=>x.duration)),largestSpans:spans.sort((a,b)=>b.duration-a.duration).slice(0,3),loaf:loaf.map(x=>({duration:x.duration,blockingDuration:x.blockingDuration,scripts:x.scripts?.map(s=>({duration:s.duration,invoker:s.invoker,source:s.sourceURL}))}))};
 });
 reports.push({dir,count:slow.length,withRenderOver33ms:slow.filter(x=>x.renderCpuMaxMs>33.333).length,withMeasuredUnitOver16ms:slow.filter(x=>x.synchronousSpanMaxMs>16.667).length,withAssociatedGpuOver50ms:slow.filter(x=>x.associatedGpuMaxMs>50).length,slow});
}
const out={limits:['Temporal overlap is association, not causal attribution.','RAF timestamp intervals are not guaranteed physical presentation intervals.','GPU elapsed queries may include bubbles; matched by render invocation, not display completion.','Nested CPU spans overlap and must not be summed. Uninstrumented browser/driver work is not free time.'],reports};
fs.writeFileSync(root+'/slow-frame-associations.json',JSON.stringify(out,null,2));console.log(JSON.stringify(reports.map(({slow,...x})=>x),null,2));
