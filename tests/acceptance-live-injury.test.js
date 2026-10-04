import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {rational} from '../src/simulation/money.js';
import {SaveRepository,serialize} from '../src/persistence/snapshots.js';
import {workerPose} from '../src/rendering/worker-actions.js';
import {LOCOMOTION as L} from '../src/simulation/locomotion-calibration.js';
import {readFileSync} from 'node:fs';
const libraries=JSON.parse(readFileSync('public/content/worker-actions.json'));
const profiles=['olderMale','olderFemale','youngMale','youngFemale'];
function navigation(s){const n=new Navigation(19,'sabana',{});n.field={blocked:()=>false,slope:()=>0,surface:()=>0};n.propsAt=()=>[];n.activeBounds=[-24,-24,24,24];n.setState(s);return n;}
function saved(s){const map=new Map(),repo=new SaveRepository({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});repo.save(s);return repo.load(s.slotId);}
function until(s,nav,predicate,seconds=150){for(let i=0;!predicate()&&i<seconds*20&&!s.pauses.length&&!s.result;i++)Game.tick(s,.05,nav);assert.ok(predicate(),JSON.stringify({time:s.time,worker:s.workers[0],raid:s.raid}));}
// Place the crop .83 m beyond the intended encounter start (20, 0): watering
// now stops outside it. Preserve the encounter geometry and all hit assertions.
function fixture(culture,profile){
 const s=Game.newGame({seed:19,culture,slotId:`injury-${culture}-${profile}`});Game.resume(s,'intro');s.ledger.balance=rational(10000);const nav=navigation(s);
 Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.plant(s,'crop','mijo',20.83,0,nav);
 s.day=3;s.completedNights=2;s.initialPreparation=false;s.tutorial.step='done';Game.pause(s,'hiring');Game.hire(s,'hire',{[profile]:1});s.dayPlan={done:true};s.nightPlan={done:true};
 until(s,nav,()=>s.workers[0].status==='acting');const w=s.workers[0],task=w.taskId;assert.ok(Math.abs(w.x-20)<1e-8&&Math.abs(w.z)<1e-8);
 // Explicit exhausted ordinary allowance; both actors' positions and all
 // later collisions, pushes, falls and recovery evolve through production ticks.
 w.runRemaining=0;spawnRaid(s,{group:['rhino']},nav);assert.ok(s.raid);assert.equal(w.status,'fleeing');assert.equal(w.taskId,null);assert.equal(s.tasks.find(t=>t.id===task).workerId,null);
 return {s,nav,w};
}

for(const culture of Game.CULTURES)for(const profile of profiles)test(`QA-106–110: ${culture}/${profile} real collision, two hits, saved fall and slowed native Run`,()=>{
 let {s,nav,w}=fixture(culture,profile),a=s.raid.animals[0];const budget=a.hitsRemaining;
 until(s,nav,()=>w.hits===1);const first=s.events.find(e=>e.type==='WorkerHit');assert.ok(first.pushed>=1.5&&first.pushed<=2);assert.equal(w.incapacitated,false);assert.ok(nav.walkable(w.x,w.z,.28,null,true));
 assert.ok(w.fallRemaining>0);assert.equal(workerPose(w,null,s.elapsed,libraries[profile]).name,'Fall');
 const before=serialize(s),restored=saved(s);assert.equal(serialize(restored),before);assert.deepEqual(workerPose(restored.workers[0],null,restored.elapsed,libraries[profile]),workerPose(w,null,s.elapsed,libraries[profile]));
 Game.pause(restored,'qa');const frozen=serialize(restored);Game.tick(restored,30,navigation(restored));assert.equal(serialize(restored),frozen);Game.resume(restored,'qa');
 s=restored;nav=navigation(s);w=s.workers[0];a=s.raid.animals[0];const still={x:w.x,z:w.z},fall=w.fallRemaining;
 Game.tick(s,Math.min(.1,fall/2),nav);assert.deepEqual({x:w.x,z:w.z},still);assert.ok(w.fallRemaining<fall);assert.equal(s.events.filter(e=>e.type==='WorkerHit').length,1);
 until(s,nav,()=>w.incapacitated);const second=s.events.find(e=>e.type==='WorkerIncapacitated');assert.ok(second.collision?second.pushed>=1.5&&second.pushed<=2:second.pushed===0);assert.equal(w.hits,2);assert.equal(w.status,'incapacitated');assert.equal(w.fallRemaining,0);
 assert.equal(s.people.find(p=>p.id===w.personId).recoveryUntil,4);assert.ok(nav.walkable(w.x,w.z,.28,null,true));assert.equal(workerPose(w,null,s.elapsed,libraries[profile]).name,'Run');
 const injured=saved(s);assert.equal(serialize(injured),serialize(s));s=injured;nav=navigation(s);w=s.workers[0];a=s.raid.animals[0];
 const p={x:w.x,z:w.z},run=w.runPhase;Game.tick(s,.5,nav);
 assert.ok(Math.hypot(w.x-p.x,w.z-p.z)>0&&Math.hypot(w.x-p.x,w.z-p.z)<=L.runMetresPerSecond*1.5*.35*.5+1e-8);assert.ok(Math.abs(w.runPhase-run-.35*.5)<1e-8);assert.equal(w.runRemaining,0);assert.equal(w.running,true);
 assert.equal(workerPose(w,null,s.elapsed,libraries[profile]).name,'Run');
 until(s,nav,()=>w.status==='home');assert.equal(w.incapacitated,true);assert.equal(w.hits,2);assert.equal(s.events.filter(e=>e.type==='WorkerHit').length,1);assert.equal(s.events.filter(e=>e.type==='WorkerIncapacitated').length,1);
 assert.ok(Math.hypot(w.x,w.z)<.25);assert.equal(w.runRemaining,0);assert.ok(a.hitsRemaining>=0);
 assert.equal(budget-a.hitsRemaining,2+s.events.filter(e=>['AnimalLogicalHit','AnimalLogicalMiss'].includes(e.type)).length);
});

for(const profile of profiles)test(`QA-107/111/112: ${profile} actual injured person rehired with a healthy colleague, ordinary recovery and emergency Run`,()=>{
 let {s,nav,w}=fixture('mapungubwe',profile);until(s,nav,()=>w.incapacitated);const personId=w.personId;
 until(s,nav,()=>w.status==='home'&&!s.raid);assert.equal(s.people.find(p=>p.id===personId).recoveryUntil,4);
 if(!s.structures.some(c=>c.status==='intact'))Game.placeStructure(s,'replacement',{x:-12,z:12},nav);
 Game.tick(s,600,nav);assert.equal(s.day,4);assert.ok(s.pauses.includes('hiring'));
 s=saved(s);nav=navigation(s);Game.hire(s,'hire-day-4',{[profile]:2});s.dayPlan={done:true};s.nightPlan={done:true};
 assert.equal(s.workers.length,2);w=s.workers.find(w=>w.personId===personId);const healthy=s.workers.find(w=>w.personId!==personId);
 assert.ok(w&&healthy);assert.equal(w.recovering,true);assert.equal(w.incapacitated,false);assert.equal(healthy.recovering,false);assert.equal(s.people.length,2);
 for(let i=0;i<5;i++)Game.plant(s,'urgent-'+i,'mijo',8+i*2,8,nav);
 const allowance=w.runRemaining,walk=w.walkPhase??0;Game.tick(s,.5,nav);
 assert.equal(w.running,false);assert.equal(w.runRemaining,allowance);assert.ok(Math.abs(w.walkPhase-walk-.75)<1e-8);assert.equal(workerPose(w,null,s.elapsed,libraries[profile]).name,'Walk_Skip');assert.equal(healthy.running,true);
 until(s,nav,()=>w.status==='acting');const assigned=s.tasks.find(t=>t.id===w.taskId),crop=s.plants.find(p=>p.id===assigned.targetId);
 assert.equal(assigned.kind,'initial');assert.equal(w.recovering,true);assert.equal(w.runRemaining,allowance);
 until(s,nav,()=>crop.water[0].status==='manual');assert.equal(s.events.filter(e=>e.type==='WaterSatisfied'&&e.targetId===crop.id).length,1);assert.equal(w.runRemaining,allowance);
 // Exhausted allowance is an explicit precondition; recovering people still
 // use emergency Run, without consuming or replenishing ordinary metres.
 w.runRemaining=0;spawnRaid(s,{group:['warthog']},nav);assert.ok(s.raid);const run=w.runPhase??0;Game.tick(s,.05,nav);
 assert.equal(w.status,'fleeing');assert.equal(w.running,true);assert.equal(w.runRemaining,0);assert.ok(Math.abs(w.runPhase-run-.05)<1e-8);assert.equal(workerPose(w,null,s.elapsed,libraries[profile]).name,'Run');
 until(s,nav,()=>!s.raid);assert.equal(s.people.find(p=>p.id===personId).recoveryUntil,4);
 Game.tick(s,600,nav);assert.equal(s.day,5);assert.ok(s.pauses.includes('hiring'));Game.hire(s,'hire-day-5',{[profile]:1});
 assert.equal(s.workers.length,1);assert.equal(s.workers[0].personId,personId);assert.equal(s.workers[0].recovering,false);assert.equal(s.workers[0].incapacitated,false);assert.equal(s.people.length,2);
});
