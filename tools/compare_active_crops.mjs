// Compare the production active-crop loop with an otherwise identical full scan.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import * as Current from '../src/simulation/game.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';

const source=process.argv[3]??'crop-lifecycle-eight-100';
assert.ok(['crop-lifecycle-eight-100','intensive-mangrove-shield-100','intensive-river-rejoin-100'].includes(source));
const output=resolve(process.argv[2]??`.cache/active-crops-comparison/${source}.json`);
const originalUrl=new URL('../src/simulation/game.js',import.meta.url);
const original=readFileSync(originalUrl,'utf8'),needle='for(const p of activeCrops(s.plants)) {';
assert.equal(original.split(needle).length,2,'Reference loop must be unique');
const reference=original.replace(needle,'for(const p of s.plants) {').replace(/from '([^']+)'/g,(match,specifier)=>specifier.startsWith('.')?`from '${new URL(specifier,originalUrl).href}'`:match);
const referencePath=resolve('.cache/active-crops-comparison/reference-game.mjs');
mkdirSync(dirname(referencePath),{recursive:true});writeFileSync(referencePath,reference);
const Full=await import(pathToFileURL(referencePath).href);
const input=`docs/qa/${source}/state.json.gz`,raw=gunzipSync(readFileSync(input));
const sha=value=>createHash('sha256').update(value).digest('hex');
const runs=[];
for(const arm of ['full','active','active','full','full','active','active','full','active','full','full','active']){
  const Game=arm==='full'?Full:Current,state=deserialize(raw.toString('utf8'));
  assert.equal(state.result,'victory');assert.equal(state.day,101);
  const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`,'utf8')).profile;
  const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
  const center=state.structures.find(c=>c.kind==='center'&&c.hp>0);assert.ok(center);
  const pose=nativeCameraPose(nav.field,[center.x,0,center.z],.5,1.16,38);
  nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
  const living=state.plants.filter(p=>p.alive).length,staff=Math.max(1,Math.min(Math.ceil(living/12),Math.floor(numberOf(state.ledger.balance)/30)));
  Game.continuePostgame(state);Game.hire(state,'qa-active-crops-hire',{olderFemale:staff});
  const cratesBefore=state.crates.length,deliveredBefore=state.crates.filter(c=>c.delivered).length;
  for(let i=0;i<5;i++)Game.tick(state,.1,nav);
  const samples=[];
  for(let i=0;i<100;i++){
    const start=performance.now();Game.tick(state,.1,nav);samples.push(performance.now()-start);
    assert.equal(state.result,null);assert.equal(state.pauses.length,0);
  }
  const sorted=[...samples].sort((a,b)=>a-b);
  runs.push({phase:runs.length<4?'calibration':'measured',arm,living,staff,history:state.plants.length,picked:state.crates.length-cratesBefore,delivered:state.crates.filter(c=>c.delivered).length-deliveredBefore,samplesMs:samples,medianMs:(sorted[49]+sorted[50])/2,p95Ms:sorted[94],stateSha256:sha(serialize(state))});
}
assert.equal(new Set(runs.map(r=>r.stateSha256)).size,1,'Active loop changed complete gameplay state');
const report={scope:'Four calibration and eight counterbalanced native domain runs, five cold-route ticks then 100 timed ticks of 0.1 s. Full and active loops differ only in the growth-loop iterable; all history remains in both states. Concurrent campaigns/browser work; not rendering FPS/GPU/mobile or a new 100-night campaign.',input,inputSha256:sha(raw),node:process.version,sourceHashes:{game:sha(original),activeCrops:sha(readFileSync(new URL('../src/simulation/active-crops.js',import.meta.url))),reference:sha(reference)},runs};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,runs:runs.map(({samplesMs,...r})=>r)}));
