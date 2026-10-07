// Native-terrain CPU diagnostic from an archived victory, not a new campaign.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import * as Game from '../src/simulation/game.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';

const output=resolve(process.argv[2]??'.cache/late-farm-profile/report.json');
const source=process.argv[3]??'intensive-mangrove-shield-100';
assert.ok(['intensive-mangrove-shield-100','intensive-river-rejoin-100','crop-lifecycle-eight-100'].includes(source),'Unknown archived case');
const input=`docs/qa/${source}/state.json.gz`;
const raw=gunzipSync(readFileSync(input)),state=deserialize(raw.toString('utf8'));
assert.equal(state.result,'victory');assert.equal(state.day,101);
const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`,'utf8')).profile;
const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
const center=state.structures.find(c=>c.kind==='center'&&c.hp>0);assert.ok(center);
const pose=nativeCameraPose(nav.field,[center.x,0,center.z],.5,1.16,38);
nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);
nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
const living=state.plants.filter(p=>p.alive).length;
const staff=Math.max(1,Math.min(Math.ceil(living/12),Math.floor(numberOf(state.ledger.balance)/30)));
Game.continuePostgame(state);Game.hire(state,'qa-native-profile-hire',{olderFemale:staff});
assert.equal(state.pauses.length,0);
let searches=0;const find=nav.findPath;nav.findPath=function(...args){searches++;return find.apply(this,args);};
const samples=[];const startMicros=Number(process.hrtime.bigint()/1000n);
for(let step=0;step<50;step++){
 const start=performance.now();Game.tick(state,.1,nav);samples.push(performance.now()-start);
 assert.equal(state.result,null);assert.equal(state.pauses.length,0);
}
const endMicros=Number(process.hrtime.bigint()/1000n),sorted=[...samples].sort((a,b)=>a-b);
const report={scope:'Fifty native simulation ticks of 0.1 s after ordinary paid postgame hiring from an archived victory. No terrain/collision/FIFO/speed/economy overrides. CPU profiling only; setup is present in the process profile, tick window markers allow separation if clocks match. Not rendering frametime, GPU, RAM, phone or a current-balance 100-night result.',input,inputSha256:createHash('sha256').update(raw).digest('hex'),node:process.version,biome:state.biome,culture:state.culture,day:state.day,living,staff,plants:state.plants.length,crates:state.crates.length,tasks:state.tasks.length,pathSearches:searches,tickWindow:{startMicros,endMicros},samplesMs:samples,medianMs:(sorted[24]+sorted[25])/2,p95Ms:sorted[47],maxMs:sorted.at(-1),stateSha256:createHash('sha256').update(serialize(state)).digest('hex')};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,samplesMs:undefined}));
