import fs from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {deserialize,serialize} from '../../src/persistence/snapshots.js';
import {tick} from '../../src/simulation/game.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';

const binary=process.env.DECLARATIVE_ATTACK_WASM;if(!binary)throw Error('Set DECLARATIVE_ATTACK_WASM');
const module=new WebAssembly.Module(fs.readFileSync(binary)),source=gunzipSync(fs.readFileSync('tests/fixtures/sabana712-d6-native-multi-reservation.json.gz')).toString();
function run(experimental){
 const game=deserialize(source),loaded=new Map(),session=createSpatialGameSession(module,game,{loaded:()=>loaded,onData:d=>loaded.set(`${d.cx},${d.cz}`,d)}),raw=session.core.wasm,counts={replan:0,blocked:0,release:0,reselect:0,selectionCalls:0,missingDeclaration:0,cancellations:0,resets:0},states=[],timeline=[];
 let adopted=0,deferredSelection=false;
 try{
  for(let z=-1;z<=2;z++)for(let x=1;x<=3;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  if(experimental)session.core.wasm={...raw,
   nav_intent_reset(){counts.resets++;return raw.nav_intent_reset();},
   nav_intent_replan_attack_route(id,x,z,ax,az){
    if(id!==adopted)return raw.nav_intent_replan_attack_route(id,x,z,ax,az);
    raw.nav_intent_attack_blockers_ptr(0);raw.nav_intent_attack_reserved_targets_ptr(0);counts.replan++;
    const status=raw.nav_declarative_attack_reconcile(id,x,z,1,0,0);if(status===8){counts.blocked++;return 3;}return status;
   },
   nav_intent_attack_cancel(id){
    if(id!==adopted)return raw.nav_intent_attack_cancel(id);
    counts.cancellations++;
    if(deferredSelection)return 0;
    const released=raw.nav_declarative_attack_release_blocked(id);if(released===1){counts.release++;deferredSelection=true;return 1;}
    const cancelled=raw.nav_declarative_attack_cancel(id);return cancelled===1?1:raw.nav_intent_attack_cancel(id);
   },
   nav_intent_plan_attack_crop(id,x,z,radius,eligible,blockers,reserved){
    if(id===adopted){counts.selectionCalls++;if(raw.nav_declarative_attack_present(id)!==1)counts.missingDeclaration++;}
    if(id!==adopted||raw.nav_declarative_attack_present(id)!==1)return raw.nav_intent_plan_attack_crop(id,x,z,radius,eligible,blockers,reserved);
    counts.reselect++;deferredSelection=false;return raw.nav_declarative_attack_reconcile(id,x,z,eligible,blockers,reserved);
   }};
  const planner=createEventDrivenTaskPlanner(session),restored=planner.resetFromState(game),nav=createSpatialNavigationMovement(session,game),stopTasks=planner.observeTasks(game),stopWorld=planner.observeWorld(game);nav.intentTaskPlanner=planner;
  try{
   const actor=game.raid.animals[0];adopted=Number(actor.id.match(/\d+$/)[0]);if(experimental&&raw.nav_declarative_attack_adopt(adopted,actor.radius)!==1)throw Error('Could not adopt restored crop route');
   for(let i=0;i<10;i++){tick(game,.1,nav);nav.serviceRaidConnectivityDemand?.();}
   if(!actor.approach||actor.status==='attacking')throw Error('Actor is not travelling to an approach');
   const {x,z}=actor.approach,d=2.5;
   for(const [wx,wz,hx,hz] of [[x-d,z,.25,d+.25],[x+d,z,.25,d+.25],[x,z-d,d+.25,.25],[x,z+d,d+.25,.25]])if(session.core.addWall(wx,wz,hx,hz)<=0)throw Error('Could not add barrier');
   const invalidated=planner.reconcileNavigationRevision(game,nav.version+1);planner.reconcileWorkerRoutes(game,{navVersion:nav.version+1});
   for(let i=0;i<80;i++){tick(game,.1,nav);nav.serviceRaidConnectivityDemand?.();states.push(createHash('sha256').update(serialize(game)).digest('hex'));const row={status:actor.status,targetId:actor.targetId,waiting:!!actor.raidWait,...(experimental?{declaration:raw.nav_declarative_attack_present(adopted)}:{})};if(!timeline.length||JSON.stringify(timeline.at(-1).state)!==JSON.stringify(row))timeline.push({step:i,state:row});}
   return {states,counts,timeline,restored:restored.restoredAnimalRoutes,invalidated,final:serialize(game),events:game.events.length};
  }finally{stopTasks();stopWorld();}
 }finally{session.dispose();}
}
const reference=run(false),candidate=run(true),firstDifference=reference.states.findIndex((hash,i)=>hash!==candidate.states[i]);
const output={scope:'Controlled barrier around one restored crop approach in a saved eight-animal raid; test-only adapter, 80 subsequent simulation ticks. No GPU or performance measurement.',equal:firstDifference<0&&reference.final===candidate.final,firstDifference:firstDifference<0?null:firstDifference,reference:{restored:reference.restored,invalidated:reference.invalidated,events:reference.events,timeline:reference.timeline},candidate:{restored:candidate.restored,invalidated:candidate.invalidated,events:candidate.events,counts:candidate.counts,timeline:candidate.timeline}};
console.log(JSON.stringify(output,null,2));if(process.env.OUTPUT)fs.writeFileSync(process.env.OUTPUT,JSON.stringify(output,null,2)+'\n');
if(!output.equal||!candidate.counts.blocked||!candidate.counts.release||!candidate.counts.reselect)throw Error('Full simulation parity or intended transitions not demonstrated');
