// QA-only native comparison: reuse entity ID indexes when resolving pending FIFO targets.
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
const output=resolve(process.argv[2]??`.cache/task-target-comparison/${source}.json`);
const warmupTicks=Number(process.argv[4]??5),probe=process.argv[5]==='probe';
assert.ok(Number.isInteger(warmupTicks)&&warmupTicks>=0&&warmupTicks<=2500);
const originalUrl=new URL('../src/simulation/game.js',import.meta.url);
const original=readFileSync(originalUrl,'utf8');
const tasksUrl=new URL('../src/simulation/tasks.js',import.meta.url),tasks=readFileSync(tasksUrl,'utf8');
const begin="  for(const group of [state.plants,state.crates,state.structures]) {";
const end="  // Eligibility is stable";
assert.equal(tasks.split(begin).length,2,'Pending resolution block must be unique');
const at=tasks.indexOf(begin),tail=tasks.indexOf(end,at),received=tasks.slice(at,tail);
assert.ok(tail>at);
const replacement=`  const findPlant=workerEntityLookup(()=>state.plants,{reuse:true}),findCrate=workerEntityLookup(()=>state.crates,{reuse:true}),findStructure=workerEntityLookup(()=>state.structures);
  for(const id of needed){
    const target=findPlant(id)??findCrate(id)??findStructure(id);
    if(target)targets.set(id,target);
  }
`;
const modules={};
mkdirSync(resolve('.cache/task-target-comparison'),{recursive:true});
for(const arm of ['full','active']){
  let taskCode=arm==='full'?tasks:tasks.replace(received,replacement);
  taskCode=taskCode.replace('  const needed=new Set(', '  qaTaskTargets.requests++;\n  const needed=new Set(')+"\nexport const qaTaskTargets={requests:0};\n";
  if(arm==='active')taskCode="import {workerEntityLookup} from '"+new URL('../src/simulation/worker-entity-lookup.js',import.meta.url).href+"';\n"+taskCode;
  taskCode=taskCode.replace(/from '([^']+)'/g,(match,specifier)=>specifier.startsWith('.')?`from '${new URL(specifier,tasksUrl).href}'`:match);
  const taskPath=resolve(`.cache/task-target-comparison/${arm}-tasks.mjs`);writeFileSync(taskPath,taskCode);
  const Task=await import(pathToFileURL(taskPath).href);
  const code=original.replace("from './tasks.js'",`from '${pathToFileURL(taskPath).href}'`).replace(/from '([^']+)'/g,(match,specifier)=>specifier.startsWith('.')?`from '${new URL(specifier,originalUrl).href}'`:match);
  assert.ok(code.includes(pathToFileURL(taskPath).href));
  const path=resolve(`.cache/task-target-comparison/${arm}-game.mjs`);
  writeFileSync(path,code);modules[arm]={Game:await import(pathToFileURL(path).href),Task,sha256:shaModule(code),tasksSha256:shaModule(taskCode)};
}
function shaModule(value){return createHash('sha256').update(value).digest('hex');}
const input=`docs/qa/${source}/state.json.gz`,raw=gunzipSync(readFileSync(input));
const sha=value=>createHash('sha256').update(value).digest('hex');
const runs=[];
for(const arm of probe?['full','active']:['full','active','active','full','full','active','active','full','active','full','full','active']){
  const Game=modules[arm].Game,state=deserialize(raw.toString('utf8'));
  modules[arm].Task.qaTaskTargets.requests=0;
  assert.equal(state.result,'victory');assert.equal(state.day,101);
  const profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`,'utf8')).profile;
  const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
  const center=state.structures.find(c=>c.kind==='center'&&c.hp>0);assert.ok(center);
  const pose=nativeCameraPose(nav.field,[center.x,0,center.z],.5,1.16,38);
  nav.setRaidView({x:pose.eye[0],z:pose.eye[2]},center);nav.setActiveBounds(activeChunkRegion({x:pose.eye[0],z:pose.eye[2]}).bounds);
  const living=state.plants.filter(p=>p.alive).length,staff=Math.max(1,Math.min(Math.ceil(living/12),Math.floor(numberOf(state.ledger.balance)/30)));
  Game.continuePostgame(state);Game.hire(state,'qa-task-target-hire',{olderFemale:staff});
  const cratesBefore=state.crates.length,deliveredBefore=state.crates.filter(c=>c.delivered).length;
  for(let i=0;i<warmupTicks;i++)Game.tick(state,.1,nav);
  const warmTargetRequests=modules[arm].Task.qaTaskTargets.requests;modules[arm].Task.qaTaskTargets.requests=0;
  const samples=[];
  for(let i=0;i<300;i++){
    const start=performance.now();Game.tick(state,.1,nav);samples.push(performance.now()-start);
    assert.equal(state.result,null);assert.equal(state.pauses.length,0);
  }
  const sorted=[...samples].sort((a,b)=>a-b);
  runs.push({phase:probe?'coverage-probe':runs.length<4?'calibration':'measured',arm,living,staff,history:state.plants.length,warmTargetRequests,targetRequests:modules[arm].Task.qaTaskTargets.requests,picked:state.crates.length-cratesBefore,delivered:state.crates.filter(c=>c.delivered).length-deliveredBefore,samplesMs:samples,medianMs:(sorted[149]+sorted[150])/2,p95Ms:sorted[284],stateSha256:sha(serialize(state))});
}
assert.equal(new Set(runs.map(r=>r.stateSha256)).size,1,'Task ID lookup changed complete gameplay state');
const report={scope:'Native domain continuations with paid hiring; optional coverage probe is not a counterbalanced benchmark. Both QA modules differ only in resolving pending task targets and have identical request counters outside serialized state; production growth and worker entity indexes are used by both, all saved history and FIFO rules remain. Concurrent campaigns/browser work; not rendering FPS/GPU/mobile or a new 100-night campaign.',warmupTicks,measuredTicks:300,stepSeconds:.1,probe,input,inputSha256:sha(raw),node:process.version,sourceHashes:{game:sha(original),tasks:sha(tasks),entityLookup:sha(readFileSync(new URL('../src/simulation/worker-entity-lookup.js',import.meta.url))),fullReference:modules.full.sha256,candidate:modules.active.sha256,fullTasks:modules.full.tasksSha256,candidateTasks:modules.active.tasksSha256,tool:sha(readFileSync(fileURLToPath(import.meta.url)))},runs};
mkdirSync(dirname(output),{recursive:true});writeFileSync(output,JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({...report,runs:runs.map(({samplesMs,...r})=>r)}));
