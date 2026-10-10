import test from 'node:test';
import assert from 'node:assert/strict';
import {newGame,resume,pause,placeStructure,plant,hire,openInitialHiring,harvest,tick,rebuildTasks,cast,requestRepair,continuePostgame,foundVillage,previewVillage} from '../src/simulation/game.js';
import {readFileSync} from 'node:fs';
import {numberOf,rational} from '../src/simulation/money.js';
import {cropSpec,hitStructure} from '../src/simulation/rules.js';
import {planNight,spawnRaid,updateRaid} from '../src/simulation/raids.js';
import {applyEvent} from '../src/simulation/events.js';
import {serialize,deserialize} from '../src/persistence/snapshots.js';
import {clearNavigation} from './clear-navigation.js';
const nav=clearNavigation();
const ready=()=>{const s=newGame({seed:712,slotId:'test'});resume(s,'intro');s.tutorial.step='center';return s;};
const setup=()=>{const s=ready();placeStructure(s,'center',{x:4,z:0},nav);plant(s,'plant','mijo',8,0,nav);openInitialHiring(s);hire(s,'hire',{olderMale:1});return s;};
test('A route blocked after reservation releases its worker without deleting the task or starting an action',()=>{
  const s=setup(),worker=s.workers[0];worker.status='idle';worker.x=7.4;worker.z=0;
  const movingNav={...nav,version:1};tick(s,.01,movingNav);assert.equal(worker.status,'walking');
  const task=s.tasks.find(t=>t.id===worker.taskId),balance=numberOf(s.ledger.balance);
  // The obstruction must reject every physical routing primitive, including
  // the new pre-A* direct/corner probes, not only the grid-search test double.
  movingNav.version++;movingNav.path=()=>null;movingNav.segmentClear=()=>false;movingNav.walkable=()=>false;tick(s,.1,movingNav);
  assert.equal(worker.status,'idle');assert.equal(worker.taskId,null);assert.equal(task.workerId,null);assert.equal(task.blocked,true);
  assert.equal(s.plants[0].growth,0);assert.equal(s.plants[0].water[0].status,'due');assert.equal(numberOf(s.ledger.balance),balance);
});
function repairScenario(){
  const s=setup();s.ledger.balance=rational(1000);s.tasks=[];
  const worker=s.workers[0];worker.status='idle';worker.taskId=null;worker.path=null;
  placeStructure(s,'wall',{kind:'wall',material:'adobe',x:12,z:0},nav);
  const target=s.structures.at(-1);target.hp=target.maxHp*.73;
  requestRepair(s,'repair-order',target.id);const before=numberOf(s.ledger.balance);
  tick(s,.001,nav);assert.equal(numberOf(s.ledger.balance),before,'Queueing and reservation must not charge');
  assert.equal(worker.status,'walking');worker.x=target.x+1.09+.28+.1;worker.z=target.z;
  return {s,worker,target,before};
}
test('Repair settles its rounded current price exactly once on arrival, without an extra animation delay',()=>{
  const {s,target,before}=repairScenario();tick(s,.001,nav);
  assert.equal(numberOf(s.ledger.balance),before-10);assert.equal(target.hp,target.maxHp);
  assert.equal(s.events.filter(e=>e.type==='RepairApplied').length,1);
  tick(s,4,nav);assert.equal(numberOf(s.ledger.balance),before-10);
});
test('Funds spent after requesting repair cancel execution at arrival without partial payment',()=>{
  const {s,target}=repairScenario(),damaged=target.hp;s.ledger.balance=rational(9);
  tick(s,.001,nav);assert.equal(numberOf(s.ledger.balance),9);assert.equal(target.hp,damaged);
  assert.ok(s.messages.some(m=>m.text.includes('fondos insuficientes')));
  assert.ok(!s.tasks.some(t=>t.kind==='repair'));
});
test('Surviving repair order becomes full reconstruction and does not wait for collapse to finish',()=>{
  for(const status of ['ruined','collapsing']){
    const {s,target,before}=repairScenario();target.hp=0;target.status=status;target.collapseRemaining=status==='collapsing'?1:0;
    tick(s,.001,nav);assert.equal(numberOf(s.ledger.balance),before-target.cost);
    assert.equal(target.status,'intact');assert.equal(target.collapseRemaining,0);assert.equal(target.hp,target.maxHp);
  }
});
test('Starting an attack immediately cancels manual repair orders and releases the worker',()=>{
  const {s,worker,target,before}=repairScenario(),damaged=target.hp;
  spawnRaid(s,{group:['warthog']},nav);
  assert.equal(worker.status,'fleeing');assert.equal(worker.taskId,null);
  assert.ok(!s.tasks.some(t=>t.kind==='repair'));assert.equal(numberOf(s.ledger.balance),before);assert.equal(target.hp,damaged);
});

test('Postgame founding uses complete native village, valid departure, exact exponential costs and persistent state',()=>{
  const s=ready();placeStructure(s,'center',{x:4,z:0},nav);s.postgame=true;s.day=101;s.initialPreparation=false;s.ledger.balance=rational(1000000);
  const payload=JSON.parse(readFileSync(new URL('../public/content/villages.json',import.meta.url),'utf8')).find(v=>v.id==='suajili');
  const preview=previewVillage(s,'suajili',100,50,payload,nav);
  assert.equal(numberOf(s.ledger.balance),1000000);assert.equal(preview.cost,50000);
  assert.equal(preview.buildings.length,payload.units.length);assert.ok(preview.entry);
  assert.equal(foundVillage(s,'village-command','suajili',100,50,payload,nav),true);
  assert.equal(numberOf(s.ledger.balance),950000);assert.equal(s.villages.length,2);
  assert.ok(s.villages[1].buildings.every(b=>b.footprint.length>=3));
  assert.equal(foundVillage(s,'village-command','suajili',100,50,payload,nav),false);
  assert.equal(numberOf(s.ledger.balance),950000);
  assert.equal(previewVillage(s,'suajili',200,50,payload,nav).cost,80000);
  assert.deepEqual(deserialize(serialize(s)).villages,s.villages);
});
test('A village without a walkable departure is rejected before charging or founding',()=>{
  const s=ready();placeStructure(s,'center',{x:4,z:0},nav);s.postgame=true;s.ledger.balance=rational(100000);
  const payload={units:[{key:'house',kind:'Edificio',min:[0,0,0],max:[1,1,1]}]};
  assert.throws(()=>foundVillage(s,'blocked-village','musgum',100,0,payload,{...nav,walkable:()=>false}),/salida transitable/);
  assert.equal(numberOf(s.ledger.balance),100000);assert.equal(s.villages.length,1);
});
test('30 canonical combinations validate and each new game starts isolated at 1500',()=>{
  for(const biome of ['sabana','gran-rio','manglares','volcanes','gran-canon','desierto'])for(const culture of ['mapungubwe','saheliana','suajili','musgum','etiope']){
    const s=newGame({biome,culture,slotId:`${biome}-${culture}`,seed:1});assert.equal(numberOf(s.ledger.balance),1500);assert.equal(s.villages[0].culture,culture);
  }
  assert.throws(()=>newGame({biome:'invalid'}));
});
test('First day center/plant/tutorial hiring sequence and payment idempotency',()=>{
  const s=ready();placeStructure(s,'center',{x:4,z:0},nav);assert.equal(numberOf(s.ledger.balance),700);assert.equal(s.tutorial.step,'plant');
  assert.equal(placeStructure(s,'center',{x:4,z:0},nav),false);plant(s,'plant','mijo',8,0,nav);assert.equal(s.tutorial.step,'hire');
  openInitialHiring(s);assert.ok(s.pauses.includes('hiring'));hire(s,'hire',{olderMale:1});assert.equal(numberOf(s.ledger.balance),665);assert.equal(hire(s,'hire-again',{olderMale:1}),false);
});
test('Invalid placement makes no economic or world modification',()=>{
  const s=ready();assert.throws(()=>placeStructure(s,'bad',{x:0,z:0},{...nav,placement:()=>({valid:false,reason:'invalid'})}));
  assert.equal(numberOf(s.ledger.balance),1500);assert.equal(s.structures.length,0);assert.equal(s.suppressed.length,0);
});
test('Workers physically plant, water and harvest; only crate delivery pays',()=>{
  const s=setup();assert.equal(s.plants[0].growth,0);tick(s,1,nav);assert.equal(s.plants[0].growth,0);
  for(let i=0;i<1800&&!s.crates.length;i++)tick(s,.1,nav);
  assert.equal(s.plants[0].growth,140);assert.equal(numberOf(s.ledger.balance),665);
  assert.equal(s.crates.length,1);assert.equal(s.crates[0].delivered,false);
  assert.equal(s.crates[0].sourcePlantId,s.plants[0].id);assert.equal(s.crates[0].species,s.plants[0].species);
  for(let i=0;i<300&&!s.crates[0].delivered;i++)tick(s,.1,nav);
  assert.equal(numberOf(s.ledger.balance),679);assert.ok(s.crates[0].delivered);
  const loaded=deserialize(serialize(s));tick(loaded,10,nav);assert.equal(numberOf(loaded.ledger.balance),679);
});
test('Stacked pauses freeze crops and spell clocks',()=>{
  const s=setup();pause(s,'menu');pause(s,'hidden');tick(s,500,nav);assert.equal(s.time,0);resume(s,'menu');tick(s,500,nav);assert.equal(s.time,0);resume(s,'hidden');tick(s,1,nav);assert.ok(Math.abs(s.time-1)<1e-9);
});
test('Manual harvest orders survive queue reconstruction, manual repairs do not',()=>{
  const s=setup();s.plants[0].growth=140;s.plants[0].water.forEach(w=>w.status='manual');harvest(s,'harvest',s.plants[0].id);
  s.ledger.balance=rational(300);s.structures[0].hp=500;requestRepair(s,'repair',s.structures[0].id);assert.ok(s.tasks.some(t=>t.kind==='repair'));rebuildTasks(s);
  assert.ok(s.tasks.some(t=>t.kind==='harvest'));assert.ok(!s.tasks.some(t=>t.kind==='repair'));
});
test('New midday center does not move plants or employees',()=>{
  const s=ready();placeStructure(s,'center',{x:4,z:0},nav);plant(s,'plant','mijo',12,0,nav);openInitialHiring(s);hire(s,'hire',{olderMale:1});s.ledger.balance=rational(5000);const original=s.plants[0].centerId;placeStructure(s,'second',{x:18,z:0},nav);
  assert.equal(s.plants[0].centerId,original);assert.equal(s.workers[0].centerId,original);plant(s,'new','mijo',24,0,nav);assert.equal(s.plants[1].centerId,s.structures[1].id);
});
test('Growth/multiply permissions, area nonoverlap, cooldown from activation and expiry',()=>{
  const s=setup();assert.throws(()=>cast(s,'early','growth',10,0,nav));s.day=5;
  cast(s,'growth','growth',10,0,nav);assert.equal(s.cooldowns.growth,90);assert.equal(s.spells[0].remaining,30);
  assert.throws(()=>cast(s,'overlap','multiply',11,0,nav),/solaparse/);tick(s,30,nav);assert.equal(s.spells.length,0);assert.ok(Math.abs(s.cooldowns.growth-60)<1e-8);
});
test('First nights introduce mandatory warthog and hyena even with zero attraction',()=>{
  const s=ready();s.day=1;planNight(s);assert.deepEqual(s.nightPlan.group,['warthog']);s.day=2;planNight(s);assert.deepEqual(s.nightPlan.group,['hyena']);
});
test('Raid drops a carried crate, frees tasks and preserves its value',()=>{
  const s=setup();const w=s.workers[0];s.crates.push({id:'crate-test',x:5,z:0,value:rational(10),carrierId:w.id,delivered:false});w.crateId='crate-test';w.status='carrying';
  spawnRaid(s,{group:['warthog']},nav);assert.equal(w.crateId,null);assert.equal(s.crates[0].carrierId,null);assert.equal(numberOf(s.ledger.balance),665);assert.equal(w.status,'fleeing');
});
test('Combo attack counts one logical hit; active raid survives roundtrip',()=>{
  const s=setup();s.time=320;spawnRaid(s,{group:['warthog']},nav);const a=s.raid.animals[0],center=s.structures[0];
  a.targetId=center.id;a.status='attacking';a.animation='Weapon_Combo_2';a.attackRemaining=1;a.hitApplied=false;a.hitsRemaining=3;a.attackId='combo';
  updateRaid(s,.3,nav);assert.equal(center.hp,600);assert.equal(a.hitsRemaining,3);const loaded=deserialize(serialize(s));
  updateRaid(loaded,.7,nav);assert.equal(loaded.structures[0].hp,580);assert.equal(loaded.raid.animals[0].hitsRemaining,2);
  updateRaid(loaded,.1,nav);assert.equal(loaded.structures[0].hp,580);assert.equal(loaded.raid.animals[0].hitsRemaining,2);
});
test('Attack crossing dawn prevents events, hiring and night completion until departure',()=>{
  const s=setup();s.ledger.balance=rational(200);s.time=599.9;s.nightPlan={at:400,done:true,group:[]};spawnRaid(s,{group:['warthog']},nav);const a=s.raid.animals[0];a.status='retreating';a.x=0;a.z=0;a.exit={x:200,z:0};
  tick(s,.2,nav);assert.equal(s.time,600);assert.equal(s.completedNights,0);assert.ok(!s.pauses.includes('hiring'));
  a.exit={x:a.x,z:a.z};a.path=null;tick(s,.1,nav);assert.equal(s.completedNights,1);assert.equal(s.day,2);assert.ok(s.pauses.includes('hiring'));
});
test('Final raid defeat takes precedence over hundredth night victory',()=>{
  const s=setup();s.time=600;s.completedNights=99;s.structures[0].status='ruined';s.ledger.balance=rational(0);s.nightPlan={at:400,done:true,group:[]};spawnRaid(s,{group:['warthog']},nav);s.raid.animals.forEach(a=>a.status='gone');
  tick(s,.1,nav);assert.equal(s.result,'defeat');assert.equal(s.completedNights,99);
});
test('Hundredth completed night wins only after economic check; postgame suppresses attacks',()=>{
  const s=setup();s.time=599.9;s.completedNights=99;s.ledger.balance=rational(10000);s.nightPlan={at:400,done:true,group:[]};tick(s,.1,nav);assert.equal(s.result,'victory');continuePostgame(s);assert.equal(s.postgame,true);planNight(s);assert.deepEqual(s.nightPlan.group,[]);
});
test('Event frost leaves mature plants intact; favorable growth keeps mandatory water debt',()=>{
  const s=setup();const p=s.plants[0];p.growth=140;p.water.forEach(w=>w.status='manual');s.eventPlan={id:'frost',kind:'frost',affectedFraction:1,negative:true};applyEvent(s);assert.equal(p.growth,140);
  p.growth=65;p.water[1].status='future';s.eventPlan={id:'favorable',kind:'favorable',magnitude:.3,negative:false};applyEvent(s);assert.equal(p.growth,107);assert.equal(p.water[1].status,'due');const once=p.growth;applyEvent(s);assert.equal(p.growth,once);
});
test('Plague consumes half remaining tolerance without killing plants or changing coins',()=>{
  const s=setup();const p=s.plants[0];p.water[0].status='manual';p.water[1].status='due';p.water[1].wait=20;s.eventPlan={kind:'plague',negative:true,affectedFraction:1};applyEvent(s);
  assert.equal(p.water[1].wait,45);assert.ok(p.alive);assert.equal(numberOf(s.ledger.balance),665);
});
