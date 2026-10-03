import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {hitStructure,operational} from '../src/simulation/rules.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {SaveRepository,serialize} from '../src/persistence/snapshots.js';
import {reserveTasks} from '../src/simulation/tasks.js';
import {workerPose} from '../src/rendering/worker-actions.js';
import {LOCOMOTION as L} from '../src/simulation/locomotion-calibration.js';
import {readFileSync} from 'node:fs';
const libraries=JSON.parse(readFileSync('public/content/worker-actions.json'));
function navigation(s){const n=new Navigation(712,'sabana',{});n.field={blocked:()=>false,slope:()=>0,surface:()=>0};n.propsAt=()=>[];n.activeBounds=[-48,-48,48,48];n.setState(s);return n;}
function farm(culture='mapungubwe',centers=1,profile='olderFemale',count=2){
 const s=Game.newGame({seed:712,slotId:'routing-'+culture,culture});Game.resume(s,'intro');s.ledger.balance=rational(10000);const nav=navigation(s);
 for(let i=0;i<centers;i++)Game.placeStructure(s,'center-'+i,{x:-12-i*15,z:0},nav);
 s.day=3;s.completedNights=2;s.initialPreparation=false;s.tutorial.step='done';Game.pause(s,'hiring');Game.hire(s,'hire',{[profile]:count});s.dayPlan={done:true};
 return {s,nav};
}
function until(s,nav,predicate,seconds=200){for(let i=0;!predicate()&&i<seconds*20&&!s.result&&!s.pauses.length;i++)Game.tick(s,.05,nav);assert.ok(predicate(),JSON.stringify({time:s.time,workers:s.workers.map(w=>w.status),raid:s.raid}));}
function saved(s){const map=new Map(),repo=new SaveRepository({getItem:k=>map.get(k)??null,setItem:(k,v)=>map.set(k,v),removeItem:k=>map.delete(k)});repo.save(s);return repo.load(s.slotId);}
const point=w=>({x:w.x,z:w.z});

test('QA-047/048: actual paid workers reserve FIFO by nearest free colleague and never duplicate plant/crate owners',()=>{
 const {s,nav}=farm();until(s,nav,()=>s.workers.every(w=>w.status==='idle'));
 // Let their independent ambient paths produce actual positions, without
 // assigning coordinates to staff or changing their paid center contracts.
 until(s,nav,()=>Math.hypot(s.workers[0].x-s.workers[1].x,s.workers[0].z-s.workers[1].z)>1,100);
 const first={x:6,z:8},second={x:-20,z:8},positions=s.workers.map(w=>({id:w.id,...point(w)}));
 Game.plant(s,'old-seed','mijo',first.x,first.z,nav);Game.plant(s,'new-seed','mijo',second.x,second.z,nav);
 const [old,newer]=s.tasks,closest=[...positions].sort((a,b)=>Math.hypot(a.x-first.x,a.z-first.z)-Math.hypot(b.x-first.x,b.z-first.z)||a.id.localeCompare(b.id))[0];
 Game.tick(s,.01,nav);assert.equal(old.workerId,closest.id);assert.ok(newer.workerId&&newer.workerId!==old.workerId);
 assert.equal(s.workers.find(w=>w.id===old.workerId).taskId,old.id);assert.equal(s.workers.find(w=>w.id===newer.workerId).taskId,newer.id);
 const reserved=serialize(s);reserveTasks(s);reserveTasks(s);assert.equal(serialize(s),reserved);
 until(s,nav,()=>s.plants.every(p=>p.water[0].status==='manual'),50);
 assert.equal(s.events.filter(e=>e.type==='WaterSatisfied').length,2);assert.equal(s.tasks.filter(t=>t.kind==='initial').length,0);
 // Produce one real crate through care and pickup. Its delivery is reserved
 // by its carrier; reconstructing queues cannot grant a second owner.
 until(s,nav,()=>s.plants[0].growth>=140,180);Game.harvest(s,'harvest',s.plants[0].id);
 until(s,nav,()=>s.workers.some(w=>w.status==='carrying'),30);const crate=s.crates[0],carrier=crate.carrierId;
 Game.rebuildTasks(s);reserveTasks(s);reserveTasks(s);assert.equal(crate.carrierId,carrier);
 assert.equal(s.workers.filter(w=>w.crateId===crate.id).length,1);assert.equal(s.tasks.filter(t=>t.kind==='crate'&&t.targetId===crate.id).length,0);
 // The same actual cargo becomes loose through the native interruption API.
 // Both paid workers evaluate it; the queue grants exactly one new owner.
 Game.dropCarriedCrate(s,s.workers.find(w=>w.id===carrier));assert.equal(crate.carrierId,null);
 Game.tick(s,.01,nav);const claim=s.tasks.find(t=>t.kind==='crate'&&t.targetId===crate.id);assert.ok(claim?.workerId);
 assert.equal(s.tasks.filter(t=>t.kind==='crate'&&t.targetId===crate.id).length,1);
 const claimed=serialize(s);reserveTasks(s);reserveTasks(s);assert.equal(serialize(s),claimed);
 assert.equal(s.workers.filter(w=>w.taskId===claim.id).length,1);
 until(s,nav,()=>!!crate.carrierId,10);assert.equal(crate.carrierId,claim.workerId);assert.equal(s.workers.filter(w=>w.crateId===crate.id).length,1);
 until(s,nav,()=>crate.delivered,30);assert.equal(s.events.filter(e=>e.type==='CrateDelivered'&&e.targetId===crate.id).length,1);
 assert.equal(Object.keys(s.ledger.entries).filter(k=>k===`deliver:${crate.id}`).length,1);
});

for(const profile of ['olderMale','olderFemale','youngMale','youngFemale'])test(`QA-060/061: ${profile} ambient rest/watch/walk stays local and a real planting command interrupts without teleporting`,()=>{
 const {s,nav}=farm('mapungubwe',1,profile,1),w=s.workers[0],anchor=s.structures[0];until(s,nav,()=>w.status==='idle');
 const rng=s.rng,seen=new Set();let moved=0;
 until(s,nav,()=>{
  seen.add(workerPose(w,null,s.elapsed,libraries[profile]).name);
  assert.ok(Math.hypot(w.x-anchor.x,w.z-anchor.z)<=8+1e-8);assert.equal(w.running,false);
  return w.idleState?.mode==='walk';
 },180);
 for(let i=0;i<5&&w.idleState?.mode==='walk';i++){
  const before=point(w);Game.tick(s,.05,nav);const step=Math.hypot(w.x-before.x,w.z-before.z);moved+=step;
  seen.add(workerPose(w,null,s.elapsed,libraries[profile]).name);
  assert.ok(step<=L.walkMetresPerSecond*.05+1e-8);assert.equal(w.running,false);
 }
 assert.ok(moved>0);assert.deepEqual(seen,new Set(['Idle','Alert','Walk_Skip']));assert.equal(s.rng,rng);
 assert.ok(w.idleState?.mode==='walk');assert.ok(w.path.every(p=>Math.hypot(p.x-anchor.x,p.z-anchor.z)<=8+1e-8));
 const before=point(w),budget=w.runRemaining;Game.plant(s,'interrupt-paseo','mijo',6,8,nav);Game.tick(s,.01,nav);
 assert.deepEqual(point(w),before);assert.equal(w.idleState,null);assert.equal(w.status,'walking');assert.equal(w.runRemaining,budget);
 const task=s.tasks.find(t=>t.targetId===s.plants[0].id);assert.equal(task.workerId,w.id);assert.equal(w.taskId,task.id);
 Game.tick(s,.05,nav);assert.ok(Math.hypot(w.x-before.x,w.z-before.z)<=L.runMetresPerSecond*.05+1e-8);
 until(s,nav,()=>s.plants[0].water[0].status==='manual',50);assert.equal(s.events.filter(e=>e.type==='WaterSatisfied').length,1);
});

for(const culture of Game.CULTURES)test(`QA-053: ${culture} a lost-center pool returns to a surviving local center after a physical raid, without another wage`,()=>{
 const {s,nav}=farm(culture,2,'olderFemale',4);until(s,nav,()=>s.workers.every(w=>w.status==='idle'));
 const [lost,survivor]=s.structures,local=s.workers.filter(w=>w.centerId===lost.id),resident=s.workers.filter(w=>w.centerId===survivor.id),cash=JSON.stringify(s.ledger),ids=s.workers.map(w=>w.id);
 // Prepared center loss through the native damage/collapse API; actual animal
 // navigation, flee, raid completion and staff recovery run unmodified.
 hitStructure(lost,1000,s.elapsed);spawnRaid(s,{group:['warthog']},nav);assert.ok(s.raid);
 until(s,nav,()=>!s.raid,180);assert.equal(survivor.status,'intact');assert.equal(JSON.stringify(s.ledger),cash);
 assert.deepEqual(s.workers.map(w=>w.id),ids);assert.ok(local.every(w=>w.centerId===survivor.id));assert.ok(resident.every(w=>w.centerId===survivor.id));
 assert.equal(s.events.filter(e=>e.type==='WorkerReassigned').length,local.length);assert.equal(s.events.filter(e=>e.type==='HiringConfirmed').length,1);
 assert.ok(s.workers.every(w=>w.contractDay===3));const positions=s.workers.map(point);
 Game.recoverDisplacedWorkers(s);assert.deepEqual(s.workers.map(point),positions);assert.equal(s.events.filter(e=>e.type==='WorkerReassigned').length,local.length);
 until(s,nav,()=>s.workers.every(w=>w.status==='idle'),60);assert.ok(s.workers.every(w=>w.centerId===survivor.id));
 const before=numberOf(s.ledger.balance);Game.placeStructure(s,'new-empty-center',{x:-12,z:12},nav);
 assert.equal(numberOf(s.ledger.balance),before-800);assert.ok(s.workers.every(w=>w.centerId===survivor.id));
 assert.equal(s.events.filter(e=>e.type==='WorkerReassigned').length,local.length);assert.equal(s.events.filter(e=>e.type==='HiringConfirmed').length,1);
});

for(const culture of Game.CULTURES)test(`QA-054/055: ${culture} displaced staff physically go home and a saved replacement recovers the same paid people`,()=>{
 const {s,nav}=farm(culture);until(s,nav,()=>s.workers.every(w=>w.status==='idle'));const lost=s.structures[0],ids=s.workers.map(w=>w.id),people=s.workers.map(w=>w.personId);
 hitStructure(lost,1000,s.elapsed);spawnRaid(s,{group:['warthog']},nav);until(s,nav,()=>!s.raid,20);
 assert.ok(s.workers.every(w=>w.displacedDay===3&&w.centerId===lost.id));
 until(s,nav,()=>s.workers.every(w=>w.status==='home'),40);assert.ok(s.workers.every(w=>Math.hypot(w.x,w.z)<.25));
 const loaded=saved(s),restoredNav=navigation(loaded),cash=numberOf(loaded.ledger.balance);
 Game.placeStructure(loaded,'replacement',{x:-12,z:12},restoredNav);
 assert.deepEqual(loaded.workers.map(w=>w.id),ids);assert.deepEqual(loaded.workers.map(w=>w.personId),people);
 assert.equal(numberOf(loaded.ledger.balance),cash-800);assert.ok(loaded.workers.every(w=>w.status==='arriving'&&w.centerId===loaded.structures[1].id&&w.contractDay===3));
 until(loaded,restoredNav,()=>loaded.workers.every(w=>w.status==='idle'),40);assert.equal(loaded.events.filter(e=>e.type==='HiringConfirmed').length,1);
 assert.equal(loaded.events.filter(e=>e.type==='WorkerReassigned').length,2);assert.ok(loaded.structures[1].status==='intact');
});

for(const culture of Game.CULTURES)test(`QA-054: ${culture} an available center in a foreign village never steals displaced contracts`,()=>{
 const {s,nav}=farm(culture),lost=s.structures[0],ids=s.workers.map(w=>w.id);
 // Explicit second settlement for the locality invariant, not a claim that
 // expansion and natural attacks coexist in the approved campaign calendar.
 s.villages.push({id:'qa-foreign-village',culture:'suajili',x:40,z:0,buildings:[]});nav.setState(s);
 Game.placeStructure(s,'foreign-center',{x:32,z:0},nav);const foreign=s.structures[1];assert.equal(foreign.villageId,'qa-foreign-village');
 assert.ok(s.workers.every(w=>w.centerId===lost.id));until(s,nav,()=>s.workers.every(w=>w.status==='idle'));
 const cash=JSON.stringify(s.ledger);hitStructure(lost,1000,s.elapsed);spawnRaid(s,{group:['warthog']},nav);assert.ok(s.raid);
 until(s,nav,()=>!s.raid,180);assert.ok(operational(foreign));assert.equal(JSON.stringify(s.ledger),cash);
 assert.ok(s.workers.every(w=>w.centerId===lost.id&&w.villageId===s.villages[0].id));assert.equal(s.events.filter(e=>e.type==='WorkerReassigned').length,0);
 until(s,nav,()=>s.workers.every(w=>w.status==='home'),40);assert.deepEqual(s.workers.map(w=>w.id),ids);
 assert.ok(s.workers.every(w=>Math.hypot(w.x,w.z)<.25));assert.equal(s.events.filter(e=>e.type==='HiringConfirmed').length,1);
});
