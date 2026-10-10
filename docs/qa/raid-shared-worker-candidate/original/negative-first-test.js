import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {gunzipSync,gzipSync} from 'node:zlib';
import {resolve} from 'node:path';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {nodeSharedRaidWorker} from '../tools/qa-shared-raid-worker-node.mjs';
import {createOpeningWorld} from '../tools/check_opening.mjs';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {Navigation} from '../src/world/navigation.js';
import {createRaidExteriorFramePrewarming} from '../src/world/raid-exterior-frame-prewarming.js';
import {raidExteriorDiagnostics,createRaidExteriorQuery} from '../src/world/raid-exterior.js';
import {CANONICAL_RAID_RADII} from '../src/world/raid-exterior-prewarming.js';
import {raidEntryRequest,raidEntryKey} from '../src/world/raid-entry-data.js';
import {computeRaidEntry} from '../src/world/compute-raid-entry.js';
import {wallLayout,WALL_UNIT} from '../src/world/wall-layout.js';
import {boundaryEdges as originalEdges} from './fixtures/native-boundary-81943608/boundary-gates.js';
import {boundaryFaces as originalFaces} from './fixtures/native-boundary-81943608/boundary-faces.js';
const sha=value=>createHash('sha256').update(value).digest('hex');
async function wait(condition,why){const start=performance.now();while(!condition()){if(performance.now()-start>7000)throw Error('Actual shared worker timeout: '+why);await new Promise(r=>setTimeout(r,5));}}
function originalRegions(s,nav,radius){const layout=wallLayout(s.structures,{}),pieces=layout.pieces.filter(p=>p.hp>0&&!p.collapse),edges=originalEdges({...layout,pieces},nav,{radius,worker:false}),virtual=edges.map(([a,b],i)=>({id:-i-1,hp:1,x:(a[0]+b[0])/2,z:(a[1]+b[1])/2,angle:Math.atan2(b[1]-a[1],b[0]-a[0]),scaleX:Math.hypot(b[0]-a[0],b[1]-a[1])/WALL_UNIT})),ids=new Set(pieces.map(p=>p.id));return originalFaces([...pieces,...virtual]).filter(f=>f.ids.some(id=>ids.has(id))).map(f=>f.polygon.map(([x,z])=>({x,z})));}
test('actual single Node thread serializes three advanced geometry→queued-entry runs; snapshots and independent canonical geometry stay exact',async()=>{
 const inputPath='docs/qa/horde-self-consistent-pilot-e040ea6f-20/native-original/responsible/state.json.gz',bytes=readFileSync(new URL('../'+inputPath,import.meta.url)),profile=JSON.parse(readFileSync(new URL('../public/content/biome-canyons.json',import.meta.url))).profile;assert.equal(sha(bytes),'1b0f1a153aaf9c7adcb91b394d232886016124316570f3e90df01bb280bb4a0b');
 const fixture=()=>{const s=deserialize(gunzipSync(bytes).toString()),nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);const focus=s.structures.find(p=>p.kind==='center'&&p.status==='intact');nav.setActiveBounds([focus.x-120,focus.z-120,focus.x+120,focus.z+120]);nav.setRaidView({x:focus.x,z:focus.z+34},focus);return {s,nav};};
 const control=fixture(),regions=CANONICAL_RAID_RADII.map(r=>[r,originalRegions(control.s,control.nav,r)]),runs=[];
 for(let i=0;i<3;i++){
  const {s,nav}=fixture(),before=serialize(s),rssBefore=process.memoryUsage().rss,node=await nodeSharedRaidWorker(),transport=node.transport;let controller,entryResult,entryError;
  try{
   controller=createRaidExteriorFramePrewarming(nav,{enabled:true,transport});let adoptionMs=0;const receive=controller.geometry.receive.bind(controller.geometry);controller.geometry.receive=(...args)=>{const start=performance.now();try{return receive(...args);}finally{adoptionMs+=performance.now()-start;}};
   const request=raidEntryRequest(s,nav,['warthog'],raidEntryKey(s,nav,['warthog']),i+1,`entry-case-${i}`),expected=computeRaidEntry(structuredClone(request));
   const entry=transport.channel('entry',request.owner,event=>{entryResult=event.data;},error=>{entryError=error;});
   const started=performance.now(),initialStart=performance.now();controller.frame(s);const initialFrameMs=performance.now()-initialStart;entry.post(request);
   assert.equal(transport.active.channel.kind,'geometry');assert.equal(transport.queue.size,1);await wait(()=>!!entryResult||!!entryError||!transport.worker,'advanced queued entry');assert.ifError(entryError);assert.ok(entryResult,transport.lastError);
   const elapsedMs=performance.now()-started;assert.equal(controller.geometry.status,'prepared');assert.equal(controller.geometry.stats.steps,0,'main must not drain geometry iterator');assert.deepEqual(raidExteriorDiagnostics(nav),{builds:0,adoptions:1});for(const [r,p] of regions)assert.deepEqual(createRaidExteriorQuery(s,nav).regionsFor(r),p);
   assert.deepEqual(entryResult,expected);assert.equal(serialize(s),before);assert.equal(transport.records[1].geometryReused,true);assert.equal(transport.stats.posted,2);assert.equal(transport.stats.replied,2);
   const run={index:i,actualThreadId:node.actual.threadId,initialFrameMs,adoptionMs,elapsedMs,rssBefore,rssAfter:process.memoryUsage().rss,geometryStats:structuredClone(controller.geometry.stats),transportStats:structuredClone(transport.stats),records:structuredClone(transport.records),stateSHA256:sha(before)};runs.push(run);entry.close();
  }finally{controller?.dispose();transport.dispose();assert.equal(node.terminationCount(),1);}
 }
 const report={scope:'three descriptive CPU-only real Node worker-thread computations via QA wrapper; not WebWorker/native MessageEvent/RAF/GPU/ABBA/peak-memory or deadline acceptance',inputPath,inputGzipSHA256:sha(bytes),canonicalRadii:CANONICAL_RAID_RADII,regions:regions.map(([radius,p])=>({radius,count:p.length})),entryGroup:['warthog'],originalNightPlanUnmodified:true,workerCountPerRun:1,runs,productionReady:false};
 if(process.env.RAID_SHARED_WORKER_EVIDENCE){const out=resolve(process.env.RAID_SHARED_WORKER_EVIDENCE);mkdirSync(out,{recursive:true});writeFileSync(resolve(out,'samples.json.gz'),gzipSync(JSON.stringify(report)));}console.log(JSON.stringify(report));
});
test('unexpected actual Node exit is actionable; private geometry falls back cooperatively and no second thread is created',async()=>{
 const {s,nav}=createOpeningWorld({seed:712,biome:'sabana',culture:'saheliana'}),before=serialize(s),node=await nodeSharedRaidWorker(),controller=createRaidExteriorFramePrewarming(nav,{enabled:true,transport:node.transport});
 try{controller.frame(s);await node.actual.terminate();await wait(()=>!node.transport.worker,'unexpected exit');assert.match(node.transport.lastError,/exited unexpectedly/);assert.equal(controller.geometry.worker,null);assert.ok(controller.geometry.pending.iterator);assert.equal(serialize(s),before);}
 finally{controller.dispose();node.transport.dispose();}
});
