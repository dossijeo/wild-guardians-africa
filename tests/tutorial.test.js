import {centerServicePoint} from '../src/world/centers.js';
import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {TutorialController} from '../src/tutorial/controller.js';
import {TutorialProfile} from '../src/tutorial/profile.js';
import {TUTORIAL_IDS} from '../src/tutorial/messages.js';
import {serialize,deserialize,SaveRepository} from '../src/persistence/snapshots.js';
import {numberOf} from '../src/simulation/money.js';
import {createOpeningWorld} from '../tools/check_opening.mjs';
class Storage {
  constructor(){this.items=new Map();}
  getItem(k){return this.items.get(k)??null;}
  setItem(k,v){this.items.set(k,String(v));}
  removeItem(k){this.items.delete(k);}
  key(i){return [...this.items.keys()][i];}
  get length(){return this.items.size;}
}
const setup=()=>{const storage=new Storage(),profile=new TutorialProfile(storage),state=Game.newGame({seed:712});return {storage,profile,state,controller:new TutorialController(state,profile)};};
test('Basic readings advance only manually and do not create, plant or pay anything',()=>{
  const {state,controller,profile}=setup();
  assert.equal(controller.presentation().id,'basic.introduction');
  for(let i=0;i<100;i++)controller.update();
  assert.equal(controller.presentation().id,'basic.introduction');assert.equal(state.time,0);assert.equal(state.structures.length,0);assert.equal(numberOf(state.ledger.balance),1500);
  controller.acknowledge();assert.equal(controller.presentation().id,'basic.center');assert.equal(controller.presentation().blocking,false);
  controller.acknowledge();assert.equal(controller.presentation(),null);assert.ok(!state.pauses.includes('tutorial-reading'));assert.ok(!state.pauses.includes('intro'));
  assert.equal(state.tutorial.step,'center');assert.equal(numberOf(state.ledger.balance),1500);assert.equal(profile.basicCompleted,false);
});
test('An already placed native center is recognized without charging a second one',()=>{
  const {s:state}=createOpeningWorld();state.tutorial.step='intro';
  const before=numberOf(state.ledger.balance),controller=new TutorialController(state,new TutorialProfile(new Storage()));
  controller.acknowledge();assert.equal(controller.presentation().id,'basic.plant');assert.equal(state.structures.length,1);assert.equal(numberOf(state.ledger.balance),before);
});
test('The native farm resumes physical worker actions after reading, and completes only after a paid delivery',()=>{
  const {s:state,nav}=createOpeningWorld(),profile=new TutorialProfile(new Storage()),controller=new TutorialController(state,profile);
  assert.equal(state.tutorial.reading,'basic.plant');controller.acknowledge();
  const center=state.structures[0];let point;
  for(let dz=-6;dz<=6&&!point;dz+=1.5)for(let dx=4.5;dx<12&&!point;dx+=1.5){const p={x:center.x+dx,z:center.z+dz};if(nav.placement(p.x,p.z,.4).valid&&nav.path(centerServicePoint(center,state,.8),p,.28,null,true))point=p;}
  assert.ok(point);Game.plant(state,'tutorial-seed','mijo',point.x,point.z,nav);controller.update();assert.equal(state.tutorial.reading,'basic.hiring');controller.acknowledge();
  Game.openInitialHiring(state);controller.update();assert.equal(controller.presentation(),null);
  Game.hire(state,'tutorial-wage',{olderFemale:1});controller.update();assert.equal(state.tutorial.reading,'basic.work');
  Game.advanceReal(state,20,nav);assert.ok(Math.abs(state.elapsed-20)<1e-8);controller.acknowledge();
  Game.tick(state,.25,nav);controller.update();assert.ok(state.elapsed>0);assert.equal(controller.presentation().blocking,false);
  let ordered=false,carrying=false;const agriculturalLessons=[];
  for(let i=0;i<2000&&!state.crates.some(c=>c.delivered);i++){
    Game.tick(state,.2,nav);controller.update();
    if(['magic.growth','magic.multiply'].includes(state.tutorial.reading)){agriculturalLessons.push(state.tutorial.reading);assert.ok(state.plants.filter(p=>p.alive).every(p=>p.water[0].status!=='due'));controller.acknowledge();}
    if(state.tutorial.reading==='basic.harvest'){assert.equal(numberOf(state.ledger.balance),665);controller.acknowledge();Game.harvest(state,'tutorial-order',state.plants[0].id);ordered=true;assert.equal(numberOf(state.ledger.balance),665);}
    if(state.crates.some(c=>!c.delivered)){carrying=true;assert.equal(state.tutorial.step,'harvest');assert.equal(controller.presentation().variant,'delivery');assert.equal(controller.presentation().blocking,false);}
  }
  assert.equal(ordered,true);assert.equal(carrying,true);assert.ok(state.crates.some(c=>c.delivered));assert.equal(numberOf(state.ledger.balance),676);assert.equal(state.day,1);
  assert.equal(state.tutorial.reading,'basic.complete');assert.equal(profile.basicCompleted,false);controller.acknowledge();assert.equal(profile.basicCompleted,true);while(state.tutorial.reading&&['magic.growth','magic.multiply'].includes(state.tutorial.reading)){agriculturalLessons.push(state.tutorial.reading);controller.acknowledge();}assert.deepEqual(agriculturalLessons,['magic.growth','magic.multiply']);assert.equal(controller.presentation(),null);
  assert.equal(Object.keys(state.ledger.entries).filter(id=>id==='tutorial-wage').length,1);
});
test('Only a previously completed basic tutorial can be skipped; new magic still interrupts the second slot',()=>{
  const {profile,state,controller,storage}=setup();assert.equal(controller.skipBasic(),false);profile.record('basic.complete');
  const second=Game.newGame({seed:713,slotId:'second'}),before=JSON.stringify(state.ledger),c=new TutorialController(second,new TutorialProfile(storage));
  assert.equal(c.presentation().canSkip,true);assert.equal(c.skipBasic(),true);assert.equal(second.tutorial.basicSkipped,true);assert.equal(c.presentation(),null);
  assert.equal(second.structures.length,0);assert.equal(second.plants.length,0);assert.equal(numberOf(second.ledger.balance),1500);assert.equal(JSON.stringify(state.ledger),before);
  second.day=3;c.update();assert.equal(second.tutorial.reading,'mechanic.defenses');c.acknowledge();assert.equal(second.tutorial.reading,'magic.growth');
  assert.ok(!second.pauses.includes('tutorial-reading'));assert.equal(second.tutorial.step,'done');
});
test('The first raid and Shield lessons take priority; agricultural lessons wait until the raid ends',()=>{
  const {state,profile,controller}=setup();profile.record('basic.complete');controller.skipBasic();
  state.day=2;state.raid={animals:[]};controller.update();assert.equal(state.tutorial.reading,'mechanic.first-raid');
  controller.acknowledge();assert.equal(state.tutorial.reading,'magic.shield');controller.acknowledge();assert.equal(state.tutorial.reading,'mechanic.defenses');controller.acknowledge();
  assert.equal(state.tutorial.reading,null);state.raid=null;controller.update();assert.equal(state.tutorial.reading,'magic.growth');controller.acknowledge();assert.equal(state.tutorial.reading,'magic.multiply');controller.acknowledge();state.raid={animals:[]};controller.update();assert.equal(state.tutorial.reading,null);assert.ok(!state.pauses.includes('tutorial-reading'));
});
test('Growth, Multiply and recovery have independent IDs; repeats and unrelated pauses remain intact',()=>{
  const {state,profile,controller}=setup();profile.record('basic.complete');profile.record('mechanic.defenses');controller.skipBasic();
  state.day=5;Game.pause(state,'menu');controller.update();assert.equal(state.tutorial.reading,null);Game.resume(state,'menu');controller.update();assert.equal(state.tutorial.reading,'magic.growth');
  Game.pause(state,'hidden');controller.acknowledge();assert.ok(state.pauses.includes('hidden'));assert.equal(state.tutorial.reading,null);Game.resume(state,'hidden');controller.update();assert.equal(state.tutorial.reading,'magic.multiply');controller.acknowledge();
  state.people.push({id:'injured',profile:'olderMale',recoveryUntil:6});controller.update();assert.equal(state.tutorial.reading,'worker.recovery');controller.acknowledge();controller.update();assert.equal(state.tutorial.reading,null);
});
test('Loading preserves an unfinished reading and queue without replaying its sound or silently acknowledging it',()=>{
  const {state,profile,controller}=setup();controller.acknowledge();
  const loaded=deserialize(serialize(state)),before=loaded.events.filter(e=>e.type==='TutorialMessageStarted').length,c=new TutorialController(loaded,profile);
  assert.equal(loaded.tutorial.reading,'basic.center');assert.equal(c.presentation().blocking,false);assert.ok(!loaded.pauses.includes('tutorial-reading'));
  assert.equal(loaded.events.filter(e=>e.type==='TutorialMessageStarted').length,before);c.acknowledge();assert.equal(c.presentation(),null);
});
test('Global profile writes merge seen IDs and malformed or unknown data cannot silence messages',()=>{
  const storage=new Storage(),a=new TutorialProfile(storage),b=new TutorialProfile(storage);a.record('magic.growth');b.record('magic.multiply');assert.ok(a.has('magic.multiply'));assert.ok(b.has('magic.growth'));
  const key=storage.key(0);storage.setItem(key,'broken');assert.equal(a.basicCompleted,false);assert.equal(a.has('magic.growth'),false);
  storage.setItem(key,JSON.stringify({version:1,seen:['unknown-message',true,42,'magic.shield']}));assert.deepEqual([...a.read()],['magic.shield']);assert.throws(()=>a.record('unknown-message'));
});
test('Storage failure leaves the slot acknowledged and playable without manufacturing a global completion',()=>{
  const {state,storage}=setup();storage.setItem=()=>{throw new Error('quota');};let failure;
  const c=new TutorialController(state,new TutorialProfile(storage),{onError:e=>failure=e});c.acknowledge();c.acknowledge();assert.equal(failure.message,'quota');assert.ok(!state.pauses.includes('tutorial-reading'));assert.ok(state.tutorial.seen.includes('basic.center'));
});
test('Victory is narrated per campaign before the result choices, and expansion appears after hiring',()=>{
  const {state,profile,controller}=setup();profile.record('basic.complete');controller.skipBasic();state.day=101;state.completedNights=100;state.result='victory';controller.update();assert.equal(state.tutorial.reading,'campaign.liberation');controller.acknowledge();assert.equal(controller.presentation().result,true);
  Game.continuePostgame(state);controller.update();assert.equal(controller.presentation(),null);Game.resume(state,'hiring');controller.update();
  while(state.tutorial.reading&&state.tutorial.reading!=='world.expansion')controller.acknowledge();assert.equal(state.tutorial.reading,'world.expansion');assert.equal(state.postgame,true);
});
test('Snapshots reject unknown tutorial IDs and incoherent modal pauses while retaining legacy slots',()=>{
  const legacy=Game.newGame({seed:712});assert.doesNotThrow(()=>serialize(legacy));
  for(const modify of [s=>s.tutorial.step='invented',s=>s.tutorial.seen=['invented'],s=>s.tutorial.pending=['invented'],s=>s.pauses.push('tutorial-reading'),s=>s.tutorial.basicSkipped='yes']){
    const state=Game.newGame({seed:712});modify(state);assert.throws(()=>serialize(state),/Tutorial|tutorial/);
  }
  assert.ok(TUTORIAL_IDS.every(id=>typeof id==='string'));
});
test('A loaded defeat takes priority over an unfinished explanation without marking that message seen',()=>{
  const {state,controller,profile}=setup();state.result='defeat';controller.update();assert.equal(state.tutorial.reading,null);assert.ok(!state.pauses.includes('tutorial-reading'));assert.equal(profile.has('basic.introduction'),false);assert.equal(controller.presentation().id,'result.defeat');
});
test('Profile memory lives outside slot listings and never changes another slot snapshot',()=>{
  const storage=new Storage(),repository=new SaveRepository(storage),a=Game.newGame({seed:1,slotId:'a'}),b=Game.newGame({seed:2,slotId:'b'});
  repository.save(a);repository.save(b);const before=storage.getItem(repository.key('b'));new TutorialProfile(storage).record('magic.growth');
  assert.equal(storage.getItem(repository.key('b')),before);assert.equal(repository.list().length,2);
});


test('a first paid crop completed after day one still closes the basic tutorial after actual delivery',()=>{
 const {s:state,nav}=createOpeningWorld(),profile=new TutorialProfile(new Storage());
 state.day=2;state.completedNights=1;state.time=0;state.dayPlan={done:true};state.nightPlan={done:true};
 const c=new TutorialController(state,profile);c.acknowledge();const center=state.structures[0];let point;
 for(let dz=-6;dz<=6&&!point;dz+=1.5)for(let dx=4.5;dx<12&&!point;dx+=1.5){const p={x:center.x+dx,z:center.z+dz};if(nav.placement(p.x,p.z,.4).valid&&nav.path(centerServicePoint(center,state,.8),p,.28,null,true))point=p;}
 assert.ok(point);Game.plant(state,'late-seed','mijo',point.x,point.z,nav);Game.pause(state,'hiring');Game.hire(state,'late-wage',{olderFemale:1});c.update();
 assert.equal(state.tutorial.step,'observe');
 for(let i=0;i<2000&&!state.crates.some(crate=>crate.delivered);i++){Game.tick(state,.2,nav);c.update();if(['magic.growth','magic.multiply'].includes(state.tutorial.reading))c.acknowledge();}
 assert.ok(state.crates.some(crate=>crate.delivered));assert.equal(state.tutorial.step,'done');assert.equal(c.presentation().id,'basic.complete');assert.equal(profile.basicCompleted,false);c.acknowledge();assert.equal(profile.basicCompleted,true);
});
test('an expired raid instruction is dropped unread while the Shield lesson remains available',()=>{
 for(const queued of [false,true]){
  const {state,controller,profile}=setup();profile.record('basic.complete');controller.skipBasic();if(queued)Game.pause(state,'menu');
  state.raid={animals:[]};controller.update();if(!queued)assert.equal(state.tutorial.reading,'mechanic.first-raid');
  state.raid=null;controller.update();Game.resume(state,'menu');controller.update();
  assert.ok(!state.tutorial.pending.includes('mechanic.first-raid'));assert.notEqual(state.tutorial.reading,'mechanic.first-raid');assert.equal(profile.has('mechanic.first-raid'),false);
  assert.ok(state.tutorial.reading==='magic.shield'||state.tutorial.pending.includes('magic.shield'));
 }
});
test('a deliberately finished basic tutorial is not reopened by missing early game entities',()=>{
 const {state,controller}=setup();state.tutorial.step='done';state.tutorial.reading=null;state.day=2;controller.update();assert.equal(state.tutorial.step,'done');
});
