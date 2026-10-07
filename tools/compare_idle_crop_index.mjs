// QA-only native comparison: reuse the living index for idle anchors, without changing gameplay.
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {pathToFileURL,fileURLToPath} from 'node:url';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {deserialize,serialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
import {activeChunkRegion} from '../src/world/active-region.js';
import {nativeCameraPose} from '../src/rendering/terrain-camera.js';

const source=process.argv[3]??'crop-lifecycle-eight-100';
assert.ok(['crop-lifecycle-eight-100','intensive-mangrove-shield-100','intensive-river-rejoin-100'].includes(source));
const output=resolve(process.argv[2]??`.cache/idle-crops-comparison/${source}.json`);
const warmupTicks=Number(process.argv[4]??5),probe=process.argv[5]==='probe';
assert.ok(Number.isInteger(warmupTicks)&&warmupTicks>=0&&warmupTicks<=2500);
const originalUrl=new URL('../src/simulation/game.js',import.meta.url);
const original=readFileSync(originalUrl,'utf8'),needle='idlePlants??=s.plants.filter(p=>p.alive);';
assert.equal(original.split(needle).length,2,'Idle filter must be unique');
const modules={};
mkdirSync(resolve('.cache/idle-crops-comparison'),{recursive:true});
for(const [arm,expression] of [['full','s.plants.filter(p=>p.alive)'],['active','activeCrops(s.plants)']]){
  const instrumented=original.replace(needle,`idlePlants??=(qaIdleCrops.requests++,${expression});`)+"\nexport const qaIdleCrops={requests:0};\n";
  const code=instrumented.replace(/from '([^']+)'/g,(match,specifier)=>specifier.startsWith('.')?`from '${new URL(specifier,originalUrl).href}'`:match);
  const path=resolve(`.cache/idle-crops-comparison/${arm}-game.mjs`);
  writeFileSync(path,code);modules[arm]={Game:await import(pathToFileURL(path).href),sha256:shaModule(code)};
}
function shaModule(value){return createHash('sha256').update(value).digest('hex');}
const input=`docs/qa/${source}/state.json.gz`,raw=gunzipSync(readFileSync(input));
const sha=value=>createHash('sha256').update(value).digest('hex');
const runs=[];
for(const arm of probe?['full','active']:['full','active','active','full','full','active','active','full','active','full','full','active']){
  const Game=modules[arm].Game,state=deserialize(raw.toString('utf8'));
  Game.qaIdleCrops.requests=0;
  assert.equal(state.result,'victory');assert.equal(state.day,101);
  const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`,'utf8')).profile;
  const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
  const center=state.structures.find(c=>c.kind==='center'&&c.hp>0);assert.ok(center);
  const pose=nativeCameraPose(nav.field,[center.x,0,center.z],.5,1.16,38);
  nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
  const living=state.plants.filter(p=>p.alive).length,staff=Math.max(1,Math.min(Math.ceil(living/12),Math.floor(numberOf(state.ledger.balance)/30)));
  Game.continuePostgame(state);Game.hire(state,'qa-idle-crops-hire',{olderFemale:staff});
  const cratesBefore=state.crates.length,deliveredBefore=state.crates.filter(c=>c.delivered).length;
  for(let i=0;i<warmupTicks;i++)Game.tick(state,.1,nav);
  const warmIdleRequests=Game.qaIdleCrops.requests;Game.qaIdleCrops.requests=0;
  const samples=[];
  for(let i=0;i<100;i++){
    const start=performance.now();Game.tick(state,.1,nav);samples.push(performance.now()-start);
    assert.equal(state.result,null);assert.equal(state.pauses.length,0);
  }
  const sorted=[...samples].sort((a,b)=>a-b);
  runs.push({phase:probe?'coverage-probe':runs.length<4?'calibration':'measured',arm,living,staff,history:state.plants.length,warmIdleRequests,idleRequests:Game.qaIdleCrops.requests,picked:state.crates.length-cratesBefore,delivered:state.crates.filter(c=>c.delivered).length-deliveredBefore,samplesMs:samples,medianMs:(sorted[49]+sorted[50])/2,p95Ms:sorted[94],stateSha256:sha(serialize(state))});
}
assert.equal(new Set(runs.map(r=>r.stateSha256)).size,1,'Idle index changed complete gameplay state');
const report={scope:'Native domain continuations with paid hiring; optional coverage probe is not a counterbalanced benchmark. Both QA modules differ only in the idle-anchor living iterable and have identical request counters outside serialized state; the production growth index is used by both, and all saved history remains. Concurrent campaigns/browser work; not rendering FPS/GPU/mobile or a new 100-night campaign.',warmupTicks,measuredTicks:100,stepSeconds:.1,probe,input,inputSha256:sha(raw),node:process.version,sourceHashes:{game:sha(original),activeCrops:sha(readFileSync(new URL('../src/simulation/active-crops.js',import.meta.url))),fullReference:modules.full.sha256,candidate:modules.active.sha256,tool:sha(readFileSync(fileURLToPath(import.meta.url)))},runs};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,runs:runs.map(({samplesMs,...r})=>r)}));
