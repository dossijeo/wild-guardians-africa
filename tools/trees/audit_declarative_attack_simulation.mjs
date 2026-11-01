import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {tick} from '../../src/simulation/game.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';

const binary=process.env.DECLARATIVE_ATTACK_WASM;if(!binary)throw Error('Set DECLARATIVE_ATTACK_WASM');
const module=new WebAssembly.Module(fs.readFileSync(binary)),source=gunzipSync(fs.readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString(),untilEnd=process.env.UNTIL_RAID_END==='1',adoptAll=process.env.ADOPT_ALL==='1',benchmark=process.env.BENCHMARK_ABBA==='1',maxSteps=untilEnd?1000:80;
function run(experimental){
 const game=deserialize(source),loaded=new Map(),session=createSpatialGameSession(module,game,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)}),raw=session.core.wasm,counts={replan:0,blocked:0,release:0,reselect:0,selectionCalls:0,missingDeclaration:0,cancellations:0,resets:0},states=[],timeline=[],times=[];
 const adoptedActors=new Map(),everAdopted=[],deferredSelection=new Set();let focus=0;
 try{
  for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  if(experimental)session.core.wasm={...raw,
   nav_intent_reset(){counts.resets++;return raw.nav_intent_reset();},
   nav_intent_replan_attack_route(id,x,z,ax,az){
    if(!adoptedActors.has(id))return raw.nav_intent_replan_attack_route(id,x,z,ax,az);
    raw.nav_intent_attack_blockers_ptr(0);raw.nav_intent_attack_reserved_targets_ptr(0);counts.replan++;
    const status=raw.nav_declarative_attack_reconcile(id,x,z,1,0,0);if(status===8){counts.blocked++;return 3;}return status;
   },
   nav_intent_attack_cancel(id){
    if(!adoptedActors.has(id))return raw.nav_intent_attack_cancel(id);
    counts.cancellations++;
    if(deferredSelection.has(id))return 0;
    const released=raw.nav_declarative_attack_release_blocked(id);if(released===1){counts.release++;deferredSelection.add(id);return 1;}
    // A completed committed strike has already released its native route.
    // Keep the high-level goal while this raid actor still has attack budget.
    if(raw.nav_declarative_attack_present(id)===1&&raw.nav_intent_actor(id)===0&&adoptedActors.get(id)?.hitsRemaining>0)return 0;
    const cancelled=raw.nav_declarative_attack_cancel(id);if(cancelled===1)adoptedActors.delete(id);return cancelled===1?1:raw.nav_intent_attack_cancel(id);
   },
   nav_intent_plan_attack_crop(id,x,z,radius,eligible,blockers,reserved){
    if(adoptedActors.has(id)){counts.selectionCalls++;if(raw.nav_declarative_attack_present(id)!==1)counts.missingDeclaration++;}
    if(!adoptedActors.has(id)||raw.nav_declarative_attack_present(id)!==1)return raw.nav_intent_plan_attack_crop(id,x,z,radius,eligible,blockers,reserved);
    counts.reselect++;deferredSelection.delete(id);return raw.nav_declarative_attack_reconcile(id,x,z,eligible,blockers,reserved);
   }};
  const planner=createEventDrivenTaskPlanner(session),restored=planner.resetFromState(game),nav=createSpatialNavigationMovement(session,game),stopTasks=planner.observeTasks(game),stopWorld=planner.observeWorld(game);nav.intentTaskPlanner=planner;
  try{
   const actor=game.raid.animals[0];focus=Number(actor.id.match(/\d+$/)[0]);
   if(experimental)for(const item of adoptAll?game.raid.animals:[actor]){const id=Number(item.id.match(/\d+$/)[0]);if(raw.nav_declarative_attack_adopt(id,item.radius)!==1)throw Error(`Could not adopt restored crop route ${id}`);adoptedActors.set(id,item);everAdopted.push(id);}
   for(let i=0;i<10;i++){tick(game,.1,nav);nav.serviceRaidConnectivityDemand?.();}
   if(!actor.approach||actor.status==='attacking')throw Error('Actor is not travelling to an approach');
   const {x,z}=actor.approach,d=2.5;
   for(const [wx,wz,hx,hz] of [[x-d,z,.25,d+.25],[x+d,z,.25,d+.25],[x,z-d,d+.25,.25],[x,z+d,d+.25,.25]])if(session.core.addWall(wx,wz,hx,hz)<=0)throw Error('Could not add barrier');
   const invalidated=planner.reconcileNavigationRevision(game,nav.version+1);planner.reconcileWorkerRoutes(game,{navVersion:nav.version+1});
   for(let i=0;i<maxSteps;i++){const started=benchmark?performance.now():0;tick(game,.1,nav);nav.serviceRaidConnectivityDemand?.();if(benchmark)times.push(performance.now()-started);states.push(createHash('sha256').update(serialize(game)).digest('hex'));const row={status:actor.status,targetId:actor.targetId,waiting:!!actor.raidWait,...(experimental?{declaration:raw.nav_declarative_attack_present(focus)}:{})};if(!timeline.length||JSON.stringify(timeline.at(-1).state)!==JSON.stringify(row))timeline.push({step:i,state:row});if(untilEnd&&!game.raid)break;}
   if(experimental&&!game.raid&&everAdopted.some(id=>raw.nav_declarative_attack_present(id)!==0))throw Error('Declaration survived raid completion');
   return {states,counts,timeline,times,restored:restored.restoredAnimalRoutes,invalidated,final:serialize(game),events:game.events.length,completed:!game.raid};
  }finally{stopTasks();stopWorld();}
 }finally{session.dispose();}
}
const reference=run(false),candidate=run(true),firstDifference=reference.states.findIndex((hash,i)=>hash!==candidate.states[i]);
const output={scope:'Controlled barrier around one restored crop approach in a saved eight-animal raid; test-only adapter. No GPU or performance measurement.',untilEnd,adoptAll,equal:firstDifference<0&&reference.states.length===candidate.states.length&&reference.final===candidate.final,firstDifference:firstDifference<0?null:firstDifference,reference:{steps:reference.states.length,completed:reference.completed,restored:reference.restored,invalidated:reference.invalidated,events:reference.events,timeline:reference.timeline},candidate:{steps:candidate.states.length,completed:candidate.completed,restored:candidate.restored,invalidated:candidate.invalidated,events:candidate.events,counts:candidate.counts,timeline:candidate.timeline}};
if(benchmark){
 const laterCandidate=run(true),laterReference=run(false),all=[reference,candidate,laterCandidate,laterReference];
 const percentile=(values,p)=>values[Math.min(values.length-1,Math.floor(values.length*p))];
 output.scope='Four independent deterministic sessions in ABBA order; CPU time of tick and raid connectivity service in Node. Excludes capture hashing, rendering and GPU; setup and wall mutation occur outside timed samples.';
 output.benchmark=all.map((run,index)=>{const values=[...run.times].sort((a,b)=>a-b);return {variant:index===1||index===2?'declarative':'reference',completed:run.completed,steps:values.length,mean:values.reduce((a,b)=>a+b,0)/values.length,p95:percentile(values,.95),p99:percentile(values,.99),max:values.at(-1),equalToReference:run.final===reference.final&&run.states.length===reference.states.length&&run.states.every((hash,i)=>hash===reference.states[i]),counts:run.counts};});
 if(output.benchmark.some(row=>!row.equalToReference||untilEnd&&!row.completed||row.variant==='declarative'&&(row.counts.missingDeclaration||!row.counts.reselect)))output.equal=false;
}
console.log(JSON.stringify(output,null,2));if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(output,null,2)+'\n');
if(!output.equal||!candidate.counts.blocked||!candidate.counts.release||!candidate.counts.reselect||candidate.counts.missingDeclaration||untilEnd&&!reference.completed)throw Error('Full simulation parity, completion or intended transitions not demonstrated');
