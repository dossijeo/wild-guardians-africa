// Diagnostic only: remove dead crop history during ticks, then restore it.
// Not a production optimization: saves, ledger and crate history stay intact.
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

const input='docs/qa/crop-lifecycle-eight-100/state.json.gz';
const raw=gunzipSync(readFileSync(input));
const output=resolve(process.argv[2]??'.cache/crop-history-comparison/report.json');
const sha=value=>createHash('sha256').update(value).digest('hex');
const runs=[];
for(const history of ['full','live-only','live-only','full','full','live-only','live-only','full','live-only','full','full','live-only']){
  const state=deserialize(raw.toString('utf8'));
  assert.equal(state.result,'victory');assert.equal(state.day,101);
  const original=state.plants;
  const live=original.filter(p=>p.alive),dead=original.filter(p=>!p.alive);
  const deadBefore=JSON.stringify(dead);
  if(history==='live-only')state.plants=live;
  const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`,'utf8')).profile;
  const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
  const center=state.structures.find(c=>c.kind==='center'&&c.hp>0);assert.ok(center);
  const pose=nativeCameraPose(nav.field,[center.x,0,center.z],.5,1.16,38);
  nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);
  nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
  const staff=Math.max(1,Math.min(Math.ceil(live.length/12),Math.floor(numberOf(state.ledger.balance)/30)));
  Game.continuePostgame(state);Game.hire(state,'qa-history-hire',{olderFemale:staff});
  // Exclude cold hiring routes, retain their real execution and state changes.
  for(let i=0;i<5;i++)Game.tick(state,.1,nav);
  const samples=[];
  for(let i=0;i<100;i++){
    const start=performance.now();Game.tick(state,.1,nav);samples.push(performance.now()-start);
    assert.equal(state.result,null);assert.equal(state.pauses.length,0);
  }
  assert.equal(JSON.stringify(dead),deadBefore,'Diagnostic discarded history must remain unchanged');
  assert.equal(state.plants.length,history==='full'?original.length:live.length,'No births allowed in this diagnostic');
  state.plants=original;
  const sorted=[...samples].sort((a,b)=>a-b);
  runs.push({phase:runs.length<4?'calibration':'measured',history,staff,living:live.length,historical:dead.length,samplesMs:samples,medianMs:(sorted[49]+sorted[50])/2,p95Ms:sorted[94],stateSha256:sha(serialize(state))});
}
assert.equal(new Set(runs.map(r=>r.stateSha256)).size,1,'Removing crop history changed gameplay state');
const report={scope:'Four calibration runs then eight A/B/B/A + B/A/A/B native domain continuations from one historical Sabana victory, five cold-route warmup ticks then 100 timed ticks each. Dead crop records temporarily omitted from all simulation consumers and restored before complete serialized-state comparison. Diagnostic only, not a valid production save transformation or a specific loop attribution. Concurrent campaigns/browser work; not stable FPS/GPU/mobile evidence.',input,inputSha256:sha(raw),node:process.version,runs};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,runs:runs.map(({samplesMs,...row})=>row)}));
