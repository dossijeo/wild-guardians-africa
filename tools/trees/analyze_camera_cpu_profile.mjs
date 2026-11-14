import {readFile,writeFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';

const root='docs/guardian/gpu-animation';
const profile=JSON.parse(await readFile(`${root}/camera-cpu-trace.cpuprofile`,'utf8'));
const trace=JSON.parse(gunzipSync(await readFile(`${root}/camera-cpu-trace.json.gz`)));
const report=JSON.parse(await readFile(`${root}/camera-cpu-trace-input.json`)),marker=trace.traceEvents.find(e=>e.name==='qa-camera-trace-anchor'),p=report.cameraPause;
if(!marker||!Number.isFinite(p?.traceAnchor)||!profile.samples?.length)throw Error('Missing synchronized samples');
const offset=marker.ts-p.traceAnchor*1000,start=offset+p.moveStart*1000,end=offset+p.moveEnd*1000,nodes=new Map(profile.nodes.map(n=>[n.id,n])),parents=new Map();
for(const node of profile.nodes)for(const child of node.children??[])parents.set(child,node.id);
const groups=new Map(),paths=new Map(),selectedNames=new Set(['updateMatrixWorld','getParameters','updateAssetLods']);let timestamp=profile.startTime,inside=0;
for(const [i,id] of profile.samples.entries()){
 const delta=profile.timeDeltas[i];timestamp+=delta;if(timestamp<start||timestamp>end)continue;inside++;
 const node=nodes.get(id),f=node?.callFrame??{},key=[f.functionName,f.url,f.lineNumber].join('|'),g=groups.get(key)??{name:f.functionName,url:f.url,line:f.lineNumber, samples:0,estimatedMs:0};g.samples++;g.estimatedMs+=delta/1000;groups.set(key,g);
 if(selectedNames.has(f.functionName)){const stack=[];for(let current=id;current;current=parents.get(current)){const frame=nodes.get(current)?.callFrame;if(!frame)break;stack.push({name:frame.functionName,url:frame.url,line:frame.lineNumber});}const stackKey=JSON.stringify(stack),entry=paths.get(stackKey)??{stack,samples:0};entry.samples++;paths.set(stackKey,entry);}
}
const top=[...groups.values()].sort((a,b)=>b.estimatedMs-a.estimatedMs).slice(0,35);
const topPaths=[...paths.values()].sort((a,b)=>b.samples-a.samples).slice(0,30);
await writeFile(`${root}/camera-cpu-profile-summary.json`,JSON.stringify({scope:'One instrumented paused-camera run. V8 statistical self samples, weighted by sampling deltas. Native waits and GPU work may be hidden or attributed to callers. Sampling and browser tracing add overhead; times are not exact function durations.',renderer:report.renderer,selected:p.selected,profileSamples:profile.samples.length,movementSamples:inside,top,topPaths},null,2)+'\n');
console.log(JSON.stringify({movementSamples:inside,top:top.slice(0,12)}));
