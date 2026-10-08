import assert from 'node:assert/strict';
import {readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {resolve,dirname} from 'node:path';
import {pathToFileURL} from 'node:url';
import * as OriginalGame from '../src/simulation/game.js';
import {Navigation,BIOME_IDS} from '../src/world/navigation.js';
import {navigationPathKey} from '../src/world/raid-navigation-warmth.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
import {diagnosticWateringSource} from './watering-route-diagnostics.mjs';
import {readBlockedCheckpoint} from './intensive-blocked-checkpoint.mjs';

const input=process.argv[2]??'docs/qa/intensive-canyon-10/state.json';
const output=resolve(process.argv[3]??'.cache/watering-diagnostics/report.json');
const ticks=Number(process.argv[4]??100);assert.ok(Number.isInteger(ticks)&&ticks>0&&ticks<=3000);
const sha=value=>createHash('sha256').update(value).digest('hex');
const workUrl=new URL('../src/world/work-points.js',import.meta.url),gameUrl=new URL('../src/simulation/game.js',import.meta.url);
const workSource=readFileSync(workUrl,'utf8').replaceAll('\r\n','\n'),gameSource=readFileSync(gameUrl,'utf8');
const absolute=(source,url)=>source.replace(/from '([^']+)'/g,(match,specifier)=>specifier.startsWith('.')?`from '${new URL(specifier,url).href}'`:match);
// A separate directory for each report avoids sharing mutable module counters.
mkdirSync(dirname(output),{recursive:true});
const workPath=resolve(dirname(output),'observed-work-points.mjs'),gamePath=resolve(dirname(output),'observed-game.mjs');
const observedWork=absolute(diagnosticWateringSource(workSource),workUrl);
assert.equal(gameSource.split("from '../world/work-points.js'").length,2);
const observedGame=absolute(gameSource.replace("from '../world/work-points.js'",`from '${pathToFileURL(workPath).href}'`),gameUrl);
writeFileSync(workPath,observedWork);writeFileSync(gamePath,observedGame);
const Work=await import(pathToFileURL(workPath).href),ObservedGame=await import(pathToFileURL(gamePath).href);
const checkpoint=/-blocked-(first|latest)\.json$/.test(input)?readBlockedCheckpoint(input):null;
const bytes=readFileSync(input),raw=checkpoint?serialize(checkpoint.state):(input.endsWith('.gz')?gunzipSync(bytes):bytes).toString('utf8');
const worlds=[];
for(const [name,Game] of [['original',OriginalGame],['observed',ObservedGame]]){
 const state=deserialize(raw),profile=JSON.parse(readFileSync(`public/content/biome-${BIOME_IDS[state.biome]}.json`,'utf8')).profile;
 const nav=new Navigation(state.seed,state.biome,profile);nav.setState(state);
 if(checkpoint){
  const saved=checkpoint.receipt.navigation;
  assert.deepEqual(nav.config,saved.config,'Checkpoint terrain recipe differs from current constructor');
  assert.deepEqual(profile,saved.profile,'Checkpoint profile differs from current runtime profile');
  if(saved.activeBounds)nav.setActiveBounds(saved.activeBounds);
  if(saved.raidView)nav.setRaidView(saved.raidView.eye,saved.raidView.target);
 }
 const living=state.plants.filter(p=>p.alive).length;
 let hired=0;
 if(state.result==='victory')Game.continuePostgame(state);
 if(state.pauses.includes('hiring')){
  hired=Math.max(1,Math.min(Math.ceil(living/12),Math.floor(numberOf(state.ledger.balance)/30)));
  assert.ok(numberOf(state.ledger.balance)>=hired*30,'Paid diagnostic hiring must be affordable');
  Game.hire(state,'qa-watering-diagnostic-hire',{olderFemale:hired});
 }
 const counters={queries:0,searches:0,failedMemoHits:0,failures:0,maxFailureKeys:0,failureDestinations:{},failureSamples:[]};
 if(name==='observed'){
  const path=nav.path,find=nav.findPath;
  nav.findPath=function(...args){counters.searches++;return find.apply(this,args);};
  nav.path=function(start,end,radius=.3,ignore=null,worker=true,margin=16){
   counters.queries++;
   const key=navigationPathKey(start,end,radius,ignore,worker,margin),memoHit=this.failedPaths.has(key);
   if(memoHit)counters.failedMemoHits++;
   const result=path.call(this,start,end,radius,ignore,worker,margin);
   if(!result){
    counters.failures++;
    // Attribution from existing request metadata only: no extra collision,
    // terrain or reach queries that could warm caches or affect the replay.
    const kind=String(end.id??'unlabelled').startsWith('home-')?'home':String(end.id??'').startsWith('water-point-')?'water-point':'other';
    const group=counters.failureDestinations[kind]??={queries:0,memoHits:0};
    group.queries++;group.memoHits+=Number(memoHit);
    if(!memoHit&&counters.failureSamples.length<32)counters.failureSamples.push({key,start:{x:start.x,z:start.z,id:start.id??null,status:start.status??null},end:{x:end.x,z:end.z,id:end.id??null},radius,ignore,worker,margin});
   }
   counters.maxFailureKeys=Math.max(counters.maxFailureKeys,this.failedPaths.size);return result;
  };
 }
 worlds.push({name,Game,state,nav,counters,hired});
}
assert.equal(serialize(worlds[0].state),serialize(worlds[1].state));
const trajectory=createHash('sha256');
for(let i=0;i<ticks;i++){
 for(const world of worlds)world.Game.tick(world.state,.1,world.nav);
 const state=serialize(worlds[0].state);assert.equal(state,serialize(worlds[1].state),`Observer changed complete state at tick ${i}`);trajectory.update(state+'\n');
}
const s=worlds[1].state;
const report={scope:'QA observer only; native historical snapshot and ordinary paid hiring where required, complete serialized parity at every tick. No positions, collision, reach, growth, RNG, speed or economic overrides. Counters do not prove global inaccessibility; a null A* can reflect a search limit. Cold-navigation replay without caches or strategy cursor; not 100-night acceptance, rendering or a performance benchmark.',checkpoint:checkpoint?{receipt:input,contextRestored:true,navigationCachesRestored:false,originalProvenance:checkpoint.receipt.provenance}:null,input,inputSha256:sha(bytes),node:process.version,ticks,stepSeconds:.1,trajectorySha256:trajectory.digest('hex'),sourceHashes:{workPoints:sha(readFileSync(workUrl)),game:sha(gameSource),observedWork:sha(observedWork),observedGame:sha(observedGame),navigation:sha(readFileSync(new URL('../src/world/navigation.js',import.meta.url))),observer:sha(readFileSync(new URL('./watering-route-diagnostics.mjs',import.meta.url))),runner:sha(readFileSync(new URL(import.meta.url)))},watering:{...Work.qaWatering},navigation:worlds[1].counters,final:{day:s.day,time:s.time,result:s.result,hired:worlds[1].hired,workers:s.workers.length,living:s.plants.filter(p=>p.alive).length,tasks:s.tasks.length,blocked:s.tasks.filter(t=>t.blocked).length,stateSha256:sha(serialize(s))}};
writeFileSync(output,JSON.stringify(report,null,2)+'\n');console.log(JSON.stringify(report));
