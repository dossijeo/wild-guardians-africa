import {readFileSync,writeFileSync} from 'node:fs';
const root=process.argv[2]??'docs/qa/residual-spikes-20261027/far-tail-attribution';
const report=JSON.parse(readFileSync(root+'/raid-ui.json'));
if(!report.ok||report.errors.length||report.failedRequests?.length)throw Error('Review failed run before attribution');
if(!report.farCpu?.spans||report.farCpu.dropped)throw Error('Missing or truncated far spans');
const start=report.casts[0].start,cpu=report.residual.cpu.filter(f=>f.at>=start);
const spans=report.farCpu.spans,slow=cpu.filter(f=>f.ms>=25);
const frames=slow.map(frame=>({frame:frame.frame,at:frame.at,cpuMs:frame.ms,phases:report.residual.phases.filter(p=>p.frame===frame.frame),far:spans.filter(s=>s.at>=frame.at-.01&&s.at+s.ms<=frame.at+frame.ms+.01)}));
const labels=new Map();for(const f of frames)for(const s of f.far){let v=labels.get(s.label);if(!v)labels.set(s.label,v={label:s.label,calls:0,totalMs:0,maxMs:0});v.calls++;v.totalMs+=s.ms;v.maxMs=Math.max(v.maxMs,s.ms);}
const result={scope:'Instrumented diagnostic, continuous render calls >=25ms. Nested far spans >=1ms only; omitted short calls remain in parent spans. Do not sum parent/child timings. No optimization claim.',recordedFrames:cpu.length,slowFrames:frames.length,labels:[...labels.values()].sort((a,b)=>b.totalMs-a.totalMs),frames:frames.sort((a,b)=>b.cpuMs-a.cpuMs),allMethodStatistics:report.farCpu.methods};
writeFileSync(root+'/tail-attribution.json',JSON.stringify(result,null,2));
console.log(JSON.stringify({recordedFrames:result.recordedFrames,slowFrames:result.slowFrames,labels:result.labels,worst:result.frames.slice(0,3)},null,2));
