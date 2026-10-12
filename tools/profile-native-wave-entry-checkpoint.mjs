// Replay an active-raid checkpoint with the same entry worker used by campaigns.
// This is a CPU diagnostic, not a campaign or rendering benchmark.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {performance} from 'node:perf_hooks';
import {deserialize} from '../src/persistence/snapshots.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {createOpeningWorld} from './check_opening.mjs';
import {NativeCampaignEntryDriver} from './native-campaign-entry-driver.mjs';
import {activeRaidEntryPlan} from '../src/world/raid-entry-data.js';
import * as Game from '../src/simulation/game.js';

const [input,output,untilText='498']=process.argv.slice(2),until=Number(untilText);
assert(input&&output&&Number.isFinite(until)&&until<=600);
const s=deserialize(gunzipSync(readFileSync(input)).toString());
assert(s.raid&&s.time<until&&!s.result);
const {nav}=createOpeningWorld({seed:s.seed,biome:s.biome,culture:s.culture,terrainVersion:s.terrainVersion});
nav.setState(s);
const center=s.structures.find(c=>c.kind==='center'&&c.hp>0);assert(center);
const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);
nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
const driver=new NativeCampaignEntryDriver(nav),samples=[],spawnTrace=[];
try {
 while(s.time<until&&!s.result){
  await driver.advancePresentation(s);
  const time=s.time,dt=1,plan=activeRaidEntryPlan(s);
  if(plan?.group?.length&&!plan.done&&time+dt>=plan.at)await driver.waitForEntry(s);
  nav.__nativeRaidSpawnTrace=stage=>spawnTrace.push({tickStart:time,...stage});
  const begun=performance.now();
  try{Game.tick(s,dt,nav);}finally{delete nav.__nativeRaidSpawnTrace;}
  samples.push({time,milliseconds:performance.now()-begun,activeActors:s.raid?.animals.filter(a=>a.status!=='gone').length??0,pendingAt:s.raid?.pendingWavePlan?.at??null});
  await driver.advancePresentation(s);
 }
}finally{await driver.dispose();}
const report={scope:'Exact active-raid checkpoint, production-equivalent entry worker, no virtual-player decisions',input,day:s.day,endTime:s.time,samples,spawnTrace,entryTransport:driver.report()};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({samples:samples.length,maxTickMs:Math.max(...samples.map(row=>row.milliseconds)),waits:report.entryTransport.waits.length,spawnTrace:spawnTrace.length}));
