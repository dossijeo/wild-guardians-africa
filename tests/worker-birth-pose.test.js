import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {PROFILES} from '../src/simulation/workforce.js';
import {rational} from '../src/simulation/money.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {nativeFarmArrivalGameFixture} from './helpers/native-farm-arrival-game.js';

const nav={placement:()=>({valid:true,suppress:[]}),setState:()=>{},walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
const poseKeys=['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining'];
const pose=w=>Object.fromEntries(poseKeys.map(k=>[k,w[k]]));
function ready(center=true){
 const s=Game.newGame();Game.resume(s,'intro');s.ledger.balance=rational(100000);s.tutorial.step='done';
 if(center)Game.placeStructure(s,'birth-center',{x:20,z:0},nav);
 Game.pause(s,'hiring');return s;
}
function checkBirth(s,w){
 const village=s.villages.find(v=>v.id===w.villageId),entry=village.entry??village;
 assert.deepEqual(pose(w),{x:entry.x,z:entry.z,heading:0,runPhase:0,walkPhase:0,carryPhase:0,runRemaining:w.runRemaining});
 assert(Number.isFinite(w.runRemaining)&&w.runRemaining>0);
 assert.equal(w.nativeRouteAdmission,undefined,'a birth pose grants no native permission');
}

for(const center of [false,true])test(`daily hiring owns the initial pose for every profile ${center?'with':'without'} a center`,()=>{
 const s=ready(center);Game.hire(s,'birth-day',Object.fromEntries(PROFILES.map(p=>[p.id,1])));
 assert.equal(s.workers.length,4);for(const w of s.workers)checkBirth(s,w);
 const saved=serialize(s),loaded=deserialize(saved);assert.equal(serialize(loaded),saved);
 assert.deepEqual(loaded.workers.map(pose),s.workers.map(pose));
});

test('additional hiring initializes only new workers and duplicate commands cannot reset a live pose',()=>{
 const s=ready();Game.hire(s,'birth-first',{youngMale:1});
 Object.assign(s.workers[0],{heading:1.3,runPhase:19.7,walkPhase:4.8,carryPhase:2.4,runRemaining:17});
 const before=structuredClone(s.workers[0]),tasks=structuredClone(s.tasks),rng=s.rng,plan=structuredClone(s.dayPlan);
 const selection=Object.fromEntries(PROFILES.map(p=>[p.id,1]));
 assert.equal(Game.hireAdditional(s,'birth-extra',selection,s.structures[0].id),true);
 assert.deepEqual(s.workers[0],before);assert.deepEqual(s.tasks,tasks);assert.deepEqual(s.dayPlan,plan);assert.equal(s.rng,rng);
 for(const w of s.workers.slice(1))checkBirth(s,w);
 const after=serialize(s);assert.equal(Game.hireAdditional(s,'birth-extra',selection,s.structures[0].id),false);assert.equal(serialize(s),after);
});

for(const profile of PROFILES)test(`${profile.id} paid newborn declares Farm from its own pose without a supplied yaw or rewriting its existing peer`,()=>{
 const f=nativeFarmArrivalGameFixture();try{
  const s=f.state;s.hiringPaidDay=s.day;s.ledger.balance=rational(100000);
  const before=structuredClone(f.worker),source=f.planner.nativeFarmArrivalRequestReference(f.worker.id),epoch=f.planner.authorityEpoch;
  assert.equal(Game.hireAdditional(s,'native-birth',{[profile.id]:1},f.worker.centerId),true);
  const born=s.workers.at(-1);checkBirth(s,born);f.planner.flushTaskEvents();
  const actor=Number(born.id.split('-').at(-1));
  // Source ABI only: physical admission is explicit here. Ordinary authority
  // admission, spawn conflicts and graphical preparation are separate work.
  assert.equal(f.w.spatial_body_upsert(9,born.x,born.z,.28,0,1),1);
  assert.equal(f.w.nav_gate_bind_worker(actor,9),1);
  const result=f.planner.requestNativeFarmArrivalResources(s,born);
  assert.equal(result.status,'requested');assert.equal(result.request.bodyId,9);
  assert.deepEqual(result.request.pose,{
   x:born.x,z:born.z,yaw:0,radius:.28,runPhase:0,walkPhase:0,carryPhase:0,runRemaining:born.runRemaining,
  });
  assert.equal(born.nativeRouteAdmission,'pending-farm-arrival-resources');
  assert.deepEqual(f.worker,before);assert.deepEqual(f.planner.nativeFarmArrivalRequestReference(f.worker.id),source);
  assert.equal(f.planner.authorityEpoch,epoch);assert.equal(f.planner.nativeGameExecutionState(),1);
  assert.equal(f.planner.commitNativeCausalClock().status,'committed');
 }finally{f.close();}
});
