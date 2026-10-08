import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {coveredDuration} from '../../../../tools/experiments/travel-span-analysis.mjs';

const receipt=JSON.parse(await readFile(new URL('crate-receipt.json',import.meta.url),'utf8'));
const raw=gunzipSync(await readFile(new URL('crate-closed.json.gz',import.meta.url)));
assert.equal(createHash('sha256').update(raw).digest('hex'),receipt.sha256);
const r=JSON.parse(raw);
assert.equal(r.done,true);assert.equal(r.disposed,true);assert.equal(r.logicalUnchanged,true);
assert.deepEqual(r.errors,[]);assert.equal(r.gpu.pending,0);assert.equal(r.gpu.disjointEvents,0);
assert.equal(r.gpu.samples.length,r.frames.length);
assert.equal(r.programEvents.filter(p=>p.stage==='travel').length,0);
const summarize=values=>{
 const a=values.slice().sort((x,y)=>x-y),q=p=>a[Math.ceil(a.length*p)-1]??null;
 return {count:a.length,p50:q(.5),p95:q(.95),p99:q(.99),max:a.at(-1)??null};
};
const gaps=r.frames.filter(f=>f.intervalMs>100);
const installSpans=r.installs.map(i=>({at:i.at,cpuMs:i.cpuMs}));
const firstInstall=Math.min(...r.installs.map(i=>i.at));
const overlap=gaps.map(f=>({endMs:f.at,intervalMs:f.intervalMs,
 installOverlapMs:coveredDuration(installSpans,f.at-f.intervalMs,f.at),
 tracedOverlapMs:coveredDuration(r.segments,f.at-f.intervalMs,f.at)}));
assert.equal(gaps.length,33);
assert.ok(r.frames.every(f=>!f.hidden));
console.log(JSON.stringify({source:receipt.source,reportSha256:receipt.sha256,
 scope:'Single instrumented paused native-world run. CPU, GPU and RAF intervals have different scopes and overlap; never add or subtract their summaries to infer idle time or causality. GPU queries bracket world.render only, excluding asynchronous preparation outside it. Four long-running CPU campaigns were live. Not an ABBA benchmark or production acceptance.',
 cpuWorldRenderMs:summarize(r.frames.map(f=>f.cpuMs)),
 gpuWorldRenderMs:summarize(r.gpu.samples.map(s=>s.ms)),
 chunkInstallCpuMs:summarize(r.installs.map(i=>i.cpuMs)),
 slowIntervals:{thresholdMs:100,count:gaps.length,beforeFirstChunkInstall:gaps.filter(f=>f.at<firstInstall).length,
 withoutChunkInstallOverlap:overlap.filter(g=>g.installOverlapMs===0).length,
 maxMeasuredInstallOverlapMs:Math.max(...overlap.map(g=>g.installOverlapMs)),
 maxMeasuredTraceOverlapMs:Math.max(...overlap.map(g=>g.tracedOverlapMs))},
 nextMeasurement:'Measure the no-draw depth-primer buffer cost, then run a fresh uninstrumented AB/BA with identical fixture and actor readiness. Do not assume chunk installation explains every long interval or that the primer makes travel stable.'},null,2));
