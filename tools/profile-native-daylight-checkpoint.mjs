// Diagnostic only: advance a copied, naturally reached dawn checkpoint.
// No player commands are issued after paid hiring, so this is not a campaign.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {performance} from 'node:perf_hooks';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import * as Game from '../src/simulation/game.js';

const [input,output,secondsText='30',staffText='16']=process.argv.slice(2);
const seconds=Number(secondsText),staff=Number(staffText);
assert(input&&output&&!existsSync(output)&&Number.isInteger(seconds)&&seconds>=1&&seconds<=300);
assert(Number.isInteger(staff)&&staff>=1&&staff<=100);
const bytes=readFileSync(input),sha256=value=>createHash('sha256').update(value).digest('hex');
const s=deserialize(gunzipSync(bytes).toString());
assert(!s.raid&&!s.result&&s.time===0&&s.pauses.length===1&&s.pauses[0]==='hiring','Requires native dawn hiring checkpoint');
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[s.biome]}.json`)).profile;
const nav=new Navigation(s.seed,s.biome,profile);nav.setState(s);
const center=s.structures.find(c=>c.kind==='center'&&c.hp>0);assert(center);
const pose=nativeCameraPose(nav.field,[center.x,0,center.z],nav.field.canyon?0:.5,nav.field.canyon?1.18:1.16,nav.field.canyon?34:38);
nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);
nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
Game.hire(s,'diagnostic-paid-hire',{olderFemale:staff});
assert(s.ledger.entries['diagnostic-paid-hire'],'Native hiring failed');
assert.equal(s.pauses.length,0);
const timings=[];
for(let i=0;i<seconds;i++){
 const start=performance.now();Game.tick(s,1,nav);timings.push(performance.now()-start);
 assert.equal(s.day,10);assert(!s.raid&&!s.result);
}
assert.equal(sha256(readFileSync(input)),sha256(bytes),'Input changed');
const report={scope:'CPU diagnostic on copied native dawn checkpoint. One paid hire, then ticks without player decisions, plants, magic or repairs. Not a gameplay campaign, raid, GPU or frame-time result.',input,inputSha256:sha256(bytes),day:s.day,seconds,staff,startTime:0,endTime:s.time,
 timingsMs:timings,totalMs:timings.reduce((n,v)=>n+v,0),maxMs:Math.max(...timings),meanMs:timings.reduce((n,v)=>n+v,0)/seconds,
 endStateSha256:sha256(serialize(s)),workers:s.workers.length,tasks:s.tasks.length,plants:s.plants.length,alive:s.plants.filter(p=>p.alive).length};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,timingsMs:undefined}));
