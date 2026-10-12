// CPU diagnostic from an exact retained campaign checkpoint. No virtual-player
// decisions are resumed; this cannot replace a native campaign replay.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {createOpeningWorld} from './check_opening.mjs';
import {NativeCampaignEntryDriver} from './native-campaign-entry-driver.mjs';
import {activeRaidEntryPlan} from '../src/world/raid-entry-data.js';
import * as Game from '../src/simulation/game.js';

const [input,output,untilText='390',traceMode='',traceTimeText='385']=process.argv.slice(2),until=Number(untilText),traceTime=Number(traceTimeText);
assert(input&&output&&Number.isFinite(until)&&until>=300&&until<=600&&Number.isFinite(traceTime)&&traceTime>=0&&traceTime<until);
const bytes=readFileSync(input),hash=value=>createHash('sha256').update(value).digest('hex');
let s=deserialize(gunzipSync(bytes).toString());
assert(!s.result&&!s.raid&&s.time>=0&&s.time<until&&s.pauses.length===0);
const startTime=s.time,startDay=s.day,startEventIds=new Set(s.events.map(e=>e.id)),startHp=new Map(s.structures.map(v=>[v.id,v.hp]));
const {nav}=createOpeningWorld({seed:s.seed,biome:s.biome,culture:s.culture,terrainVersion:s.terrainVersion});nav.setState(s);
const pathStats={calls:0,failed:0,milliseconds:0};
const queryStats={walkable:{calls:0,milliseconds:0},segmentClear:{calls:0,milliseconds:0},terrainValid:{calls:0,milliseconds:0},coarseSegmentClear:{calls:0,milliseconds:0},ring:{calls:0,rejected:0,milliseconds:0}};
if(traceMode==='trace'){
 const originalPath=nav.path;
 nav.path=function(...args){const active=!!this.__nativeTickPhaseTrace,started=active?performance.now():0,result=originalPath.apply(this,args);
  if(active){pathStats.calls++;if(!result)pathStats.failed++;pathStats.milliseconds+=performance.now()-started;}
  return result;
 };
 for(const [name,bucket] of [['walkable',queryStats.walkable],['segmentClear',queryStats.segmentClear],['terrainValid',queryStats.terrainValid],['coarseSegmentClear',queryStats.coarseSegmentClear],['approachRingBlocked',queryStats.ring]]){
  const original=nav[name];if(!original)continue;
  nav[name]=function(...args){const active=!!this.__nativeTickPhaseTrace,started=active?performance.now():0,result=original.apply(this,args);
   if(active){bucket.calls++;bucket.milliseconds+=performance.now()-started;if(name==='approachRingBlocked'&&result)bucket.rejected++;}
   return result;
  };
 }
}
const center=s.structures.find(c=>c.kind==='center'&&c.hp>0);assert(center);
const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
const driver=new NativeCampaignEntryDriver(nav),samples=[],phaseTrace=[];let raidReloaded=null;
try{
 while(s.day===startDay&&s.time<until&&!s.result){
  await driver.advancePresentation(s);
  const time=s.time,dt=s.time<300||s.raid?1:5;
  const entryPlan=activeRaidEntryPlan(s);
  if(entryPlan?.group?.length&&!entryPlan.done&&s.time+dt>=entryPlan.at)await driver.waitForEntry(s);
  const started=performance.now();
  if(traceMode==='trace'&&Math.abs(time-traceTime)<1e-6){
   nav.__nativeTickPhaseTrace=stage=>phaseTrace.push({...stage,tickStartTime:time});
   nav.__nativeRaidSpawnTrace=stage=>phaseTrace.push({phase:'spawn-'+stage.stage,...stage,tickStartTime:time});
  }
  try{Game.tick(s,dt,nav);}finally{delete nav.__nativeTickPhaseTrace;delete nav.__nativeRaidSpawnTrace;}
  samples.push({time,dt,milliseconds:performance.now()-started,raidActors:s.raid?.animals.length??0,activeActors:s.raid?.animals.filter(a=>a.status!=='gone').length??0,workers:s.workers.length,plants:s.plants.length});
  await driver.advancePresentation(s);
  if(s.raid&&raidReloaded!==s.raid.id){raidReloaded=s.raid.id;s=deserialize(serialize(s));nav.setState(s);}
 }
}finally{await driver.dispose();}
assert.equal(hash(readFileSync(input)),hash(bytes));
const newEvents=s.events.filter(e=>!startEventIds.has(e.id)),eventCounts=Object.fromEntries([...new Set(newEvents.map(e=>e.type))].map(type=>[type,newEvents.filter(e=>e.type===type).length]));
const damagedStructures=s.structures.filter(v=>v.hp<(startHp.get(v.id)??v.hp)).map(v=>({id:v.id,kind:v.kind,lostHp:(startHp.get(v.id)??v.hp)-v.hp}));
const report={scope:'Copied native checkpoint advanced through real game ticks and production-equivalent Node entry transport, but without virtual-player decisions, spells or repairs. CPU diagnostic only; not an economic/raid campaign result or rendering frame-time.',input,inputSha256:hash(bytes),day:s.day,startTime,endTime:s.time,raid:!!s.raid,samples,phaseTrace,pathStats,queryStats,raidActors:s.raid?.animals.map(a=>({species:a.species,spawn:a.spawn,status:a.status,hitsRemaining:a.hitsRemaining,targetId:a.targetId}))??[],eventCounts,damagedStructures,entryTransport:driver.report(),stateSha256:hash(serialize(s))};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({day:report.day,endTime:report.endTime,raid:report.raid,samples:samples.length,totalMs:samples.reduce((n,r)=>n+r.milliseconds,0),maximumMs:Math.max(...samples.map(r=>r.milliseconds))}));
