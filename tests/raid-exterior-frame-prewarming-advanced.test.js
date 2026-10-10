import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import {createRaidExteriorFramePrewarming} from '../src/world/raid-exterior-frame-prewarming.js';
import {raidExteriorDiagnostics,hasRaidExteriorGeometry} from '../src/world/raid-exterior.js';
import {CANONICAL_RAID_RADII} from '../src/world/raid-exterior-prewarming.js';

const inputPath='docs/qa/horde-self-consistent-pilot-e040ea6f-20/native-original/responsible/state.json.gz';
const sha=value=>createHash('sha256').update(value).digest('hex');
const summary=values=>{
 const sorted=[...values].sort((a,b)=>a-b),percentile=p=>sorted[Math.ceil(p*sorted.length)-1];
 return {samples:values.length,totalMs:values.reduce((a,b)=>a+b,0),p50Ms:percentile(.5),p90Ms:percentile(.9),p95Ms:percentile(.95),p99Ms:percentile(.99),maxMs:sorted.at(-1),soft2msViolations:values.filter(v=>v>2).length};
};
test('retained advanced frame-controller preparation and120 already-ready calls preserve input and disclose all CPU samples',()=>{
 const bytes=readFileSync(new URL('../'+inputPath,import.meta.url));assert.equal(sha(bytes),'1b0f1a153aaf9c7adcb91b394d232886016124316570f3e90df01bb280bb4a0b');
 const s=deserialize(gunzipSync(bytes).toString()),profile=JSON.parse(readFileSync(new URL('../public/content/biome-canyons.json',import.meta.url))).profile,nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
 assert.equal(s.structures.filter(p=>p.kind==='wall').length,103);assert.equal(s.plants.filter(p=>p.alive).length,865);
 const original=serialize(s),controller=createRaidExteriorFramePrewarming(nav,{enabled:true}),geometry=controller.geometry;
 const rows=[],update=geometry.update.bind(geometry),pump=geometry.pump.bind(geometry);let sample;
 // Lightweight external measurement only. Native implementation, budgets,
 // iterator, state, source and ordering are unchanged. Timing overhead remains.
 geometry.update=(...args)=>{const start=performance.now();try{return update(...args);}finally{sample.updateMs=performance.now()-start;}};
 geometry.pump=(...args)=>{const start=performance.now();try{return pump(...args);}finally{sample.pumpMs=performance.now()-start;}};
 const call=stage=>{
  sample={stage,index:rows.length,statusBefore:geometry.status,stepsBefore:geometry.stats.steps,phaseBefore:geometry.pending?.phase??null};
  const start=performance.now();controller.frame(s);sample.frameMs=performance.now()-start;
  Object.assign(sample,{statusAfter:geometry.status,stepsAfter:geometry.stats.steps,phaseAfter:geometry.pending?.phase??null});rows.push(sample);
 };
 const start=performance.now();do{call('preparation');}while(geometry.status==='working'&&rows.length<20000);
 const preparationElapsedMs=performance.now()-start;assert.equal(geometry.status,'prepared',geometry.lastError);assert.equal(controller.stats.errors,0);assert.ok(hasRaidExteriorGeometry(s,nav,CANONICAL_RAID_RADII));
 const readySteps=geometry.stats.steps,readyJobs=geometry.stats.jobs,readyAdoptions=raidExteriorDiagnostics(nav).adoptions;
 for(let i=0;i<120;i++)call('already-prepared');
 assert.equal(geometry.stats.steps,readySteps);assert.equal(geometry.stats.jobs,readyJobs);assert.equal(raidExteriorDiagnostics(nav).adoptions,readyAdoptions);assert.deepEqual(raidExteriorDiagnostics(nav),{builds:0,adoptions:1});assert.equal(serialize(s),original);
 const summarize=stage=>{const selected=rows.filter(r=>r.stage===stage);return {frame:summary(selected.map(r=>r.frameMs)),update:summary(selected.map(r=>r.updateMs)),pump:summary(selected.map(r=>r.pumpMs))};};
 const report={scope:'single descriptive CPU-only controller driver; full samples; no RAF/GPU/ABBA or rendered frametime/deadline acceptance',implementationSource:'0085d5e281edad1d8061e2ac86ca89b4d4cbe4f0',inputPath,inputGzipSHA256:sha(bytes),initialStateSHA256:sha(original),finalStateSHA256:sha(serialize(s)),walls:103,livingCrops:865,preparationElapsedMs,preparation:summarize('preparation'),alreadyPrepared:summarize('already-prepared'),controllerStats:controller.stats,geometryStats:geometry.stats,rows,productionReady:false};
 if(process.env.RAID_FRAME_ADVANCED_EVIDENCE){const out=resolve(process.env.RAID_FRAME_ADVANCED_EVIDENCE);mkdirSync(out,{recursive:true});writeFileSync(resolve(out,'samples.json.gz'),gzipSync(JSON.stringify(report)));}
 const {rows:fullSamples,...compact}=report;console.log(JSON.stringify(compact));controller.dispose();
});
