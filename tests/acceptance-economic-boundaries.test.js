import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {Navigation} from '../src/world/navigation.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {hitStructure,dawnMinimum,operational} from '../src/simulation/rules.js';
import {SaveRepository,serialize} from '../src/persistence/snapshots.js';

// Production navigation on explicitly flat, prop-free terrain. A one-chunk
// resident region isolates the exit/terminal pipeline, not terrain generation.
function navigation(s){const nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.activeBounds=[-24,-24,24,24];nav.setState(s);return nav;}
function farm(culture='mapungubwe'){
 const s=Game.newGame({seed:712,slotId:'economics-'+culture,culture});Game.resume(s,'intro');s.ledger.balance=rational(10000);
 const nav=navigation(s);Game.placeStructure(s,'center',{x:-12,z:0},nav);s.initialPreparation=false;s.tutorial.step='done';s.day=3;s.completedNights=2;
 return {s,nav};
}
function saved(s){const values=new Map(),repo=new SaveRepository({getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)});repo.save(s);return repo.load(s.slotId);}
function destroy(s,nav){hitStructure(s.structures[0],1000,s.elapsed);Game.tick(s,3.3,nav);assert.equal(s.structures[0].status,'ruined');}
function finish(s,nav,limit=200){for(let i=0;s.raid&&!s.result&&i<limit*20;i++)Game.tick(s,.05,nav);assert.equal(s.raid,null);}

for(const culture of Game.CULTURES)test(`QA-129/130: ${culture} a real last-center attack settles at exactly 799/800 before dawn`,()=>{
 for(const money of [799,800]){
  const {s,nav}=farm(culture);s.time=400;s.nightPlan={done:true};s.dayPlan={done:true};s.ledger.balance=rational(money);
  // Explicit Rhino incursion to exercise physical destruction. It is not a
  // claim that an empty farm's natural threat planner selects this animal.
  spawnRaid(s,{group:['rhino']},nav);assert.ok(s.raid);const animal=s.raid.animals[0],budget=animal.hitsRemaining;
  assert.ok(budget>=4);finish(s,nav);assert.equal(s.structures.some(operational),false);
  assert.ok(s.events.some(e=>e.type==='StructureHit'));assert.ok(['collapsing','ruined'].includes(s.structures[0].status));assert.ok(s.structures[0].hp<=126);
  assert.equal(s.events.filter(e=>e.type==='RaidEnded').length,1);assert.equal(numberOf(s.ledger.balance),money);
  assert.ok(s.time<600);assert.equal(s.completedNights,2);assert.equal(s.events.filter(e=>e.type==='Dawn').length,0);
  assert.equal(s.result,money===799?'defeat':null);assert.equal(s.events.filter(e=>e.type==='GameOver').length,money===799?1:0);
  const loaded=saved(s);assert.equal(serialize(loaded),serialize(s));
  if(money===799){const frozen=serialize(loaded);Game.tick(loaded,120,navigation(loaded));assert.equal(serialize(loaded),frozen);}
  else{
   const before=serialize(loaded);assert.throws(()=>Game.placeStructure(loaded,'night-rebuild',{x:-12,z:12},navigation(loaded)),/disponible/);assert.equal(serialize(loaded),before);
   Game.tick(loaded,600-loaded.time,navigation(loaded));assert.equal(loaded.result,'defeat');assert.equal(loaded.day,4);
   assert.equal(loaded.events.filter(e=>e.type==='GameOver').length,1,'800 survives the raid check but cannot meet the empty dawn minimum 905');
  }
 }
});

for(const culture of Game.CULTURES)test(`QA-131: ${culture} dawn checks operational centers and living/undelivered resources at each exact boundary`,()=>{
 for(const center of ['intact','collapsing','ruined'])for(const resource of ['none','living','dead','loose-crate','delivered-crate'])for(const offset of [-1,0,1]){
  const {s,nav}=farm(culture);
  if(resource!=='none'){
   Game.plant(s,'seed','mijo',8,0,nav);const p=s.plants[0];p.alive=resource==='living';
   if(resource.endsWith('crate'))s.crates.push({id:'qa-crate',species:'mijo',sourcePlantId:p.id,x:8,z:0,value:rational(9),delivered:resource==='delivered-crate',carrierId:null});
  }
  if(center!=='intact')destroy(s,nav);
  if(center==='collapsing'){s.structures[0].status='collapsing';s.structures[0].collapseRemaining=2;}
  nav.setState(s);s.time=599.9;s.nightPlan={done:true};s.dayPlan={done:true};s.eventPlan=null;
  const resources=resource==='living'||resource==='loose-crate',minimum=center==='intact'?(resources?100:105):(resources?900:905);
  s.ledger.balance=rational(minimum+offset);s.hiringSelection={youngMale:10,youngFemale:10};
  assert.equal(dawnMinimum(s),minimum);const loaded=saved(s),restoredNav=navigation(loaded);
  Game.tick(s,.1,nav);Game.tick(loaded,.1,restoredNav);assert.equal(serialize(loaded),serialize(s));
  assert.equal(s.day,4);assert.equal(s.completedNights,3);assert.equal(s.time,0);assert.equal(s.result,offset<0?'defeat':null);
  assert.equal(s.pauses.includes('hiring'),offset>=0);assert.equal(s.events.filter(e=>e.type==='GameOver').length,offset<0?1:0);
  assert.equal(s.events.filter(e=>e.type==='Dawn').length,offset>=0?1:0);assert.equal(numberOf(s.ledger.balance),minimum+offset);
  assert.equal(s.hiringPaidDay,null);assert.equal(s.workers.length,0);
 }
});

for(const culture of Game.CULTURES)test(`QA-130: ${culture} 800 permits a new center after an explicit raid at a daylight clock has physically ended`,()=>{
 const {s,nav}=farm(culture);s.time=100;s.dayPlan={done:true};s.ledger.balance=rational(800);
 // Explicit group, not the daytime 10%/attraction planner. Exercise physical
 // combat and the recovery permission at a daylight clock without altering it.
 spawnRaid(s,{group:['rhino']},nav);assert.ok(s.raid);
 finish(s,nav);assert.equal(s.result,null);assert.equal(s.structures.some(operational),false);assert.ok(s.time<300);
 Game.placeStructure(s,'replacement',{x:-12,z:12},nav);assert.equal(s.structures.filter(operational).length,1);
 assert.equal(numberOf(s.ledger.balance),0);assert.equal(s.events.filter(e=>e.type==='GameOver').length,0);
 assert.equal(s.events.filter(e=>e.type==='PlacementCommitted').length,2);assert.equal(s.ledger.entries.replacement.n,'-800');
});

for(const culture of Game.CULTURES)test(`QA-134/C07: ${culture} a last-night raid crossing dawn resolves before defeat or victory`,()=>{
 for(const money of [799,800,905]){
  const {s,nav}=farm(culture);s.day=100;s.completedNights=99;s.time=599.5;s.nightPlan={done:true};s.dayPlan={done:true};s.ledger.balance=rational(money);
  spawnRaid(s,{group:['rhino']},nav);assert.ok(s.raid);Game.tick(s,.5,nav);
  assert.equal(s.time,600);assert.equal(s.day,100);assert.equal(s.completedNights,99);assert.equal(s.result,null);assert.deepEqual(s.pauses,[]);
  assert.equal(s.events.filter(e=>['Dawn','CampaignWon','GameOver'].includes(e.type)).length,0);
  finish(s,nav);assert.equal(s.raid,null);assert.equal(s.structures.some(operational),false);
  const ended=s.events.findIndex(e=>e.type==='RaidEnded'),terminal=s.events.findIndex(e=>e.type===(money===905?'CampaignWon':'GameOver'));
  assert.ok(ended>=0&&terminal>ended);assert.equal(s.result,money===905?'victory':'defeat');
  assert.equal(s.completedNights,money===799?99:100);assert.equal(s.day,money===799?100:101);
  assert.equal(s.events.filter(e=>e.type==='CampaignWon').length,money===905?1:0);assert.equal(s.events.filter(e=>e.type==='GameOver').length,money===905?0:1);
  assert.equal(s.pauses.includes('hiring'),false);assert.equal(numberOf(s.ledger.balance),money);
  const loaded=saved(s),frozen=serialize(loaded);Game.tick(loaded,30,navigation(loaded));assert.equal(serialize(loaded),frozen);
 }
});

test('QA-132: an unaffordable remembered selection does not defeat an otherwise viable farm and can be adjusted',()=>{
 const {s,nav}=farm();Game.plant(s,'seed','mijo',8,0,nav);s.time=599.9;s.nightPlan={done:true};s.dayPlan={done:true};s.eventPlan=null;s.ledger.balance=rational(100);s.hiringSelection={youngMale:3};
 Game.tick(s,.1,nav);assert.equal(s.result,null);assert.deepEqual(s.pauses,['hiring']);
 const before=serialize(s);assert.throws(()=>Game.hire(s,'expensive',s.hiringSelection));assert.equal(serialize(s),before);
 const loaded=saved(s);Game.hire(loaded,'adjusted',{olderFemale:1});assert.equal(loaded.result,null);assert.deepEqual(loaded.pauses,[]);
 assert.equal(loaded.workers.length,1);assert.equal(numberOf(loaded.ledger.balance),0);assert.equal(loaded.hiringPaidDay,loaded.day);
 assert.equal(Game.hire(loaded,'repeat',{olderFemale:1}),false);assert.equal(loaded.workers.length,1);
});

test('QA-134: starting night 100 is not a victory even when no attack is selected',()=>{
 for(const culture of Game.CULTURES){
  const {s,nav}=farm(culture);s.day=100;s.completedNights=99;s.time=299.9;s.dayPlan={done:true};s.ledger.balance=rational(105);
  Game.tick(s,.1,nav);assert.equal(s.time,300);assert.equal(s.result,null);assert.equal(s.completedNights,99);
  assert.equal(s.events.filter(e=>e.type==='NightStarted').length,1);assert.equal(s.events.filter(e=>e.type==='CampaignWon').length,0);
  Game.tick(s,299.9,nav);assert.equal(s.result,null);assert.equal(s.completedNights,99);assert.equal(s.raid,null);
  Game.tick(s,.1,nav);assert.equal(s.result,'victory');assert.equal(s.completedNights,100);assert.equal(s.day,101);
  assert.equal(s.events.filter(e=>e.type==='CampaignWon').length,1);
 }
});

test('QA-133: the approved 100-coin threshold admits one slow banana but does not guarantee multi-day solvency',t=>{
 const {s,nav}=farm();Game.plant(s,'seed','platano',8,0,nav);s.ledger.balance=rational(100);s.day=101;s.completedNights=100;s.postgame=true;
 Game.openInitialHiring(s);Game.hire(s,'paid-first-day',{olderFemale:1});
 for(let i=0;s.day===101&&!s.result&&i<12000;i++){s.eventPlan=null;Game.advanceReal(s,.05,nav);}
 assert.equal(s.result,'defeat');assert.equal(s.day,102);assert.equal(numberOf(s.ledger.balance),0);
 assert.ok(s.plants[0].growth>0&&s.plants[0].growth<570);assert.equal(s.crates.length,0);
 assert.equal(s.events.filter(e=>e.type==='HiringConfirmed').length,1);assert.equal(s.events.filter(e=>e.type==='GameOver').length,1);
 assert.equal(s.events.filter(e=>e.type==='CrateDelivered').length,0);assert.equal(s.events.filter(e=>e.type==='CampaignWon').length,0);
 t.diagnostic(JSON.stringify({day:s.day,result:s.result,money:numberOf(s.ledger.balance),species:s.plants[0].species,growth:s.plants[0].growth,requiredGrowth:570,waters:s.plants[0].water,crates:s.crates.length}));
});
