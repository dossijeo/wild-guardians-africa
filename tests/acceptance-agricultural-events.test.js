import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {selectEvent,applyEvent} from '../src/simulation/events.js';
import {cropSpec} from '../src/simulation/rules.js';
import {waterPlant} from '../src/simulation/crops.js';
import {rational} from '../src/simulation/money.js';
import {serialize,SaveRepository} from '../src/persistence/snapshots.js';

// Paid plants/centre in a funded postcampaign fixture. Straight routes isolate
// event, clock, queue and snapshot integration, not original terrain/rendering.
const nav={placement:()=>({valid:true,suppress:[]}),setState(){},terrainValid:()=>true,walkable:()=>true,path:(_a,b)=>[{x:b.x,z:b.z}]};
function saved(s){
 const values=new Map(),storage={getItem:k=>values.get(k)??null,setItem:(k,v)=>values.set(k,v),removeItem:k=>values.delete(k)};
 const repository=new SaveRepository(storage);repository.save(s);return repository.load(s.slotId);
}
function farm(){
 const s=Game.newGame({seed:712,slotId:'event-acceptance'});Game.resume(s,'intro');s.ledger.balance=rational(100000);
 Game.placeStructure(s,'center',{x:0,z:0},nav);s.day=101;s.completedNights=100;s.postgame=true;s.initialPreparation=false;s.tutorial.step='done';
 for(let i=0;i<60;i++){
  const species=['mijo','platano','girasol'][Math.floor(i/20)];Game.plant(s,`seed-${i}`,species,6+i%10*1.5,-4.5+Math.floor(i/10)*1.5,nav);
  const p=s.plants.at(-1);waterPlant(p);p.growth=cropSpec(species).growth_seconds*.1;
 }
 Game.rebuildTasks(s);s.time=300;return s;
}
const template=farm(),key=e=>`${e.kind}/${e.species?'species':'farm'}/${e.severity}`;
// Discover actual persisted PRNG seeds rather than substituting random results.
const plans=new Map();let noEvent;
for(let i=1;i<=4000&&(plans.size<27||!noEvent);i++){
 const s=structuredClone(template);s.seed=String(Math.imul(i,2654435761)>>>0);s.rng=Number(s.seed)||918271;
 Game.tick(s,.01,nav);
 if(s.eventPlan)plans.set(key(s.eventPlan),s);else noEvent??=s;
}

test('QA-126: actual night entry covers all five event types, three intensities and legal scopes',()=>{
 assert.equal(plans.size,27);assert.ok(noEvent);
 for(const s of plans.values()){
  const e=s.eventPlan;assert.equal(e.applied,false);assert.equal(e.id,'agricultural-101');
  assert.equal(e.magnitude,[.1,.2,.3][e.severity]);
  if(e.negative){const [lo,hi]=[[.05,.1],[.1,.2],[.2,.3]][e.severity];assert.ok(e.affectedFraction>=lo&&e.affectedFraction<hi);}
  else assert.equal(e.affectedFraction,1);
  if(e.kind==='plague')assert.ok(e.species);
  assert.equal(s.messages.filter(m=>/plantas/.test(m.text)).length,0);
  const before=serialize(s);selectEvent(s);assert.equal(serialize(s),before);
  const plan=JSON.stringify(e);Game.tick(s,.1,nav);assert.equal(JSON.stringify(s.eventPlan),plan);
  assert.equal(s.events.filter(e=>e.type==='NightStarted').length,1);
 }
 const before=JSON.stringify({rng:noEvent.rng,plants:noEvent.plants,messages:noEvent.messages});Game.tick(noEvent,10,nav);
 assert.equal(noEvent.eventPlan,null);assert.equal(JSON.stringify({rng:noEvent.rng,plants:noEvent.plants,messages:noEvent.messages}),before);
 assert.equal(noEvent.events.filter(e=>e.type==='NightStarted').length,1);
});

for(const [scenario,night] of plans)test(`QA-127: ${scenario} replays once through dawn and snapshots`,()=>{
 const s=structuredClone(night);s.time=599.9;const restored=saved(s);
 const coins=JSON.stringify(s.ledger),living=s.plants.filter(p=>p.alive).length;
 Game.tick(s,.1,nav);Game.tick(restored,.1,nav);assert.equal(serialize(s),serialize(restored));
 assert.equal(s.day,102);assert.equal(s.time,0);assert.deepEqual(s.pauses,['hiring']);assert.equal(s.eventPlan,null);
 const events=s.events.filter(e=>e.type==='AgriculturalEventApplied');assert.equal(events.length,1);
 const targets=events[0].targets;assert.equal(new Set(targets).size,targets.length);
 const source=night.eventPlan,eligible=night.plants.filter(p=>p.alive&&(!source.species||p.species===source.species));
 assert.equal(targets.length,source.negative?Math.floor(eligible.length*source.affectedFraction):eligible.length);
 assert.ok(targets.every(id=>eligible.some(p=>p.id===id)));assert.equal(JSON.stringify(s.ledger),coins);
 for(const p of s.plants){
  const expected=structuredClone(night.plants.find(q=>q.id===p.id)),spec=cropSpec(p.species);
  if(targets.includes(p.id)){
   if(source.kind==='frost')expected.growth=Math.max(0,expected.growth-spec.growth_seconds*.1);
   if(source.kind==='plague')expected.nextTolerancePenalty=.5;
   if(source.kind==='favorable'){
    expected.growth+=spec.growth_seconds*source.magnitude;
    for(const water of expected.water)if(water.status==='future'&&water.at<=expected.growth)water.status='due';
   }
   if(source.kind==='fertile')expected.harvestBonus=source.magnitude*100;
   if(source.kind==='season')expected.toleranceBonus=source.magnitude;
  }
  assert.deepEqual(p,expected);
 }
 assert.equal(s.plants.filter(p=>p.alive).length,living);assert.equal(s.result,null);
 assert.equal(s.messages.filter(m=>/plantas/.test(m.text)).length,1);
 const after=saved(s),snapshot=serialize(after);Game.tick(after,600,nav);assert.equal(serialize(after),snapshot);
 // Even an already-applied event restored before closeNight cannot apply twice.
 const applied=structuredClone(night);applyEvent(applied);const once=saved(applied),before=serialize(once);applyEvent(once);assert.equal(serialize(once),before);
});

test('QA-128: specific selection excludes species with fewer than five living plants',()=>{
 let seen=0,rejected=0,farmWide=0;
 for(let i=1;i<=2000;i++){
  const s=structuredClone(template);s.rng=Math.imul(i,2654435761)>>>0;
  // Four living millet, five banana, no living sunflower. Dead plants do not qualify.
  for(const [index,p] of s.plants.entries())p.alive=index<4||index>=20&&index<25;
  selectEvent(s);
  if(s.eventPlan?.species){seen++;assert.equal(s.eventPlan.species,'platano');}
  else if(s.eventPlan)farmWide++;
  const unavailable=structuredClone(template);unavailable.rng=Math.imul(i,2654435761)>>>0;
  for(const [index,p] of unavailable.plants.entries())p.alive=index<4||index>=20&&index<24;
  selectEvent(unavailable);assert.ok(!unavailable.eventPlan?.species);
  if(!unavailable.eventPlan)rejected++;
 }
 assert.ok(seen>0&&farmWide>0&&rejected>0);
});
