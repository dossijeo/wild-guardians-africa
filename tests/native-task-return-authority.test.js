import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeIdleCycleGameFixture} from './helpers/native-idle-cycle-game.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {createPlant} from '../src/simulation/crops.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';
import {tick} from '../src/simulation/game.js';

const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {promise,resolve};};
async function movingTask(profile,onReady){
 const source=nativeIdleCycleGameFixture({mode:'rest',remaining:5,profile:profile.id,peer:false});let f;
 try{
  const state=structuredClone(source.state),worker=state.workers[0];state.time=profile.end-.55;
  const point=source.point(-4,6),target=createPlant(`plant-${state.nextId++}`,'mijo',point.x,point.z,worker.centerId);
  target.growth=999999;for(const slot of target.water)slot.status='manual';state.plants.push(target);
  // A nearby authored Home endpoint keeps this test about the complete
  // return transition rather than repeatedly exercising a long clear route.
  state.villages.find(v=>v.id===worker.villageId).entry=source.point(-9,0);
  f=await nativeProductionAuthority(state,{onReady});
  await untilProduction(f,()=>f.records.some(r=>r.kind==='initial-idle-body'&&r.committed));
  assert.equal(f.command({kind:'harvest',id:'harvest-before-shift-end',targetId:target.id}).value,true);
  for(let i=0;i<4&&!f.records.some(r=>r.kind==='task-start'&&r.committed);i++){f.advance();await f.present();}
  await untilProduction(f,()=>f.records.some(r=>r.kind==='task-start'&&r.committed));
  const start=f.records.find(r=>r.kind==='task-start'&&r.committed),before=f.snapshot();
  return {f,start,before,source,async close(){await f.close();source.close();}};
 }catch(error){await f?.close();source.close();throw error;}
}
const pose=w=>[w.x,w.z,w.heading,w.runPhase,w.walkPhase,w.carryPhase];

test('unsupported return checks the same rounded clock edge before moving native bodies',()=>{
 const f=createNativeTaskGameFixture();try{
  const end=Math.min(...f.state.workers.map(w=>PROFILES.find(p=>p.id===w.profile).end));
  f.state.time=end-.05-4.5e-12;const elapsed=f.state.elapsed,at=f.state.time,bodies=[f.body(1),f.body(3)],tasks=f.state.workers.map(w=>w.taskId);
  assert(at+.05<end);assert(Math.abs(at+.05-end)<1e-9);
  f.nav.intentTaskPlanner={...f.planner,nativeTaskReturnSource:()=>null};
  assert.throws(()=>tick(f.state,.05,f.nav),/unsupported return boundary/);
  assert.equal(f.state.time,at);assert.equal(f.state.elapsed,elapsed);assert.deepEqual([f.body(1),f.body(3)],bodies);assert.deepEqual(f.state.workers.map(w=>w.taskId),tasks);
 }finally{f.close();}
});

for(const profile of PROFILES)test(`${profile.id}: ordinary shift end retains Task through delayed READY25, then Home18 and absence19`,async()=>{
 const stop=deferred(),home=deferred();let stopReady=false,homeReady=false;
 const t=await movingTask(profile,async record=>{
  if(record.kind==='task-route-stop'){stopReady=true;await stop.promise;}
  if(record.kind==='home-route'){homeReady=true;await home.promise;}
 });const {f,start,before}=t,taskId=before.workers[0].taskId,actor=before.workers[0].id;
 try{
  for(let i=0;i<16&&!stopReady;i++){f.advance();await f.present();}
  await untilProduction(f,()=>stopReady);
  const waiting=f.snapshot(),stopRecord=f.records.find(r=>r.kind==='task-route-stop');
  assert(waiting.time>=profile.end);assert.equal(stopRecord.committed,false);
  assert.equal(waiting.workers[0].status,'walking');assert.equal(waiting.workers[0].nativeRouteAdmission,'native-task');
  assert.equal(waiting.workers[0].taskId,taskId);assert.equal(waiting.tasks.find(t=>t.id===taskId).workerId,actor);
  const stoppedOwner=stopRecord.resources.nativeStop.routes.find(r=>r.nativeRoute.actorId===start.resources.actorId);
  assert.equal(stoppedOwner.bodyId,start.resources.bodyId);
  f.command({kind:'pause',reason:'task-stop-proof'});const paused=f.snapshot();f.advance();assert.deepEqual(pose(f.snapshot().workers[0]),pose(paused.workers[0]));
  assert.equal(f.snapshot().elapsed,paused.elapsed);f.command({kind:'resume',reason:'task-stop-proof'});
  for(let i=0;i<3;i++){f.advance();await f.present();}
  const later=f.snapshot();assert.notDeepEqual(pose(later.workers[0]),pose(waiting.workers[0]));
  assert.equal(later.workers[0].taskId,taskId);assert.equal(later.tasks.find(t=>t.id===taskId).workerId,actor);
  assert.equal(f.records.filter(r=>r.kind==='home-route').length,0);
  stop.resolve();await untilProduction(f,()=>homeReady);
  assert.equal(stopRecord.committed,true);const held=f.snapshot(),worker=held.workers[0];
  assert.equal(worker.status,'returning');assert.equal(worker.nativeRouteAdmission,'pending-home-resources');
  assert.equal(worker.taskId,null);assert.equal(held.tasks.find(t=>t.id===taskId).workerId,null);
  const homeRecord=f.records.find(r=>r.kind==='home-route');assert.equal(homeRecord.resources.bodyId,start.resources.bodyId);
  for(let i=0;i<3;i++){f.advance();await f.present();}
  assert.deepEqual(pose(f.snapshot().workers[0]),pose(worker));
  home.resolve();await untilProduction(f,()=>homeRecord.committed);
  for(let i=0;i<250&&!f.records.some(r=>r.kind==='home-arrival');i++){f.advance();await f.present();}
  await untilProduction(f,()=>f.records.some(r=>r.kind==='home-arrival'&&r.committed));
  assert.equal(f.snapshot().workers[0].status,'home');
  assert.deepEqual(f.records.filter(r=>r.committed).map(r=>r.kind),['initial-idle-body','task-start','task-route-stop','home-route','home-arrival']);
  assert.equal(f.host.inspect().failed,false);assert.deepEqual(f.faults,[]);assert.deepEqual(f.errors,[]);
 }finally{stop.resolve();home.resolve();await t.close();}
});

test('a rejected Task25 preparation never publishes Task25 or Home and fails closed',async()=>{
 const ready=deferred();let stopReady=false;
 const t=await movingTask(PROFILES.find(p=>p.id==='youngMale'),async r=>{if(r.kind==='task-route-stop'){stopReady=true;await ready.promise;throw Error('deliberate Task25 READY rejection');}});
 try{
  for(let i=0;i<16&&!stopReady;i++){t.f.advance();await t.f.present();}await untilProduction(t.f,()=>stopReady);
  const state=t.f.snapshot();assert.equal(state.workers[0].taskId,t.before.workers[0].taskId);
  assert.equal(state.workers[0].nativeRouteAdmission,'native-task');assert.equal(state.tasks.find(t=>t.id===state.workers[0].taskId).workerId,state.workers[0].id);
  ready.resolve();
  for(let i=0;i<200&&t.f.authority.nativeIntentProductionStatus().phase!=='failed';i++)await t.f.present();
  assert.equal(t.f.authority.nativeIntentProductionStatus().phase,'failed');
  assert.equal(t.f.records.filter(r=>r.kind==='task-route-stop'&&r.committed).length,0);assert.equal(t.f.records.filter(r=>r.kind==='home-route').length,0);
  assert.throws(()=>t.f.snapshot(),/deliberate Task25 READY rejection/);
 }finally{ready.resolve();await t.close();}
});
