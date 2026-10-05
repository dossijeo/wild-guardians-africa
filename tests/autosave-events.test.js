import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {rational} from '../src/simulation/money.js';
import {SaveRepository,serialize} from '../src/persistence/snapshots.js';
import {autosaveEventAfter} from '../src/app/autosave-events.js';
import {saveGame} from '../src/app/save-game.js';

import {clearNavigation} from './clear-navigation.js';
const nav=clearNavigation();
function storage(){const data=new Map();let writes=0;return {data,get writes(){return writes;},getItem:k=>data.get(k)??null,setItem:(k,v)=>{writes++;data.set(k,v);},removeItem:k=>data.delete(k)};}
function farm(slotId='autosave-a'){
 const s=Game.newGame({seed:712,slotId});Game.resume(s,'intro');s.ledger.balance=rational(10000);
 Game.placeStructure(s,'center',{x:0,z:0},nav);Game.plant(s,'seed','mijo',6,0,nav);
 s.day=101;s.completedNights=100;s.postgame=true;s.initialPreparation=false;s.tutorial.step='done';return s;
}
function advance(s,seconds,repository){const before=s.events.at(-1)?.id;Game.tick(s,seconds,nav);const event=autosaveEventAfter(s.events,before);if(event)assert.equal(saveGame(s,repository),true);return event;}

test('an idle frame or unrelated new worker event never reuses an old dawn',()=>{
 const events=[{id:'event-10',type:'Dawn'},{id:'event-20',type:'Dawn'}];
 assert.equal(autosaveEventAfter(events,'event-20'),null);
 assert.equal(autosaveEventAfter([...events,{id:'event-21',type:'WaterSatisfied'}],'event-20'),null);
 assert.equal(autosaveEventAfter([...events,{id:'event-21',type:'WaterSatisfied'},{id:'event-22',type:'RaidEnded'}],'event-21').id,'event-22');
});
test('fresh boundaries work with repeated IDs in separate slots and a rolled-over event buffer',()=>{
 for(let slot=0;slot<2;slot++)assert.equal(autosaveEventAfter([{id:'event-1',type:'NightStarted'},{id:'event-2',type:'Dawn'}],'event-1').id,'event-2');
 const events=Array.from({length:200},(_,i)=>({id:`event-${i+201}`,type:i===199?'RaidEnded':'WaterSatisfied'}));
 assert.equal(autosaveEventAfter(events,'event-200').id,'event-400');
 assert.equal(autosaveEventAfter(events,'event-400'),null);
 assert.equal(autosaveEventAfter([{id:'event-1',type:'Dawn'}],undefined).id,'event-1');
});
test('actual dawn saves after agriculture and queue rebuild, once, without changing another slot',()=>{
 const s=farm(),other=farm('autosave-b'),store=storage(),repo=new SaveRepository(store);repo.save(other);const untouched=store.data.get(repo.key(other.slotId));
 s.time=599.9;s.nightPlan={done:true,group:[]};s.eventPlan={id:'season',kind:'season',magnitude:.2,negative:false};
 assert.equal(advance(s,.1,repo).type,'Dawn');const loaded=repo.load(s.slotId);
 assert.equal(loaded.day,102);assert.deepEqual(loaded.pauses,['hiring']);assert.equal(loaded.plants[0].toleranceBonus,.2);
 assert.equal(loaded.events.filter(e=>e.type==='AgriculturalEventApplied').length,1);assert.deepEqual(loaded.tasks,s.tasks);
 const writes=store.writes;for(let i=0;i<5;i++)assert.equal(advance(s,10,repo),null);
 assert.equal(store.writes,writes);assert.equal(store.data.get(repo.key(other.slotId)),untouched);
});
test('actual raid exit saves its final state once, with reservations and queues resolved',()=>{
 const s=farm();s.day=21;s.completedNights=20;s.postgame=false;s.time=320;s.nightPlan={done:true,group:[]};
 const store=storage(),repo=new SaveRepository(store);spawnRaid(s,{group:['warthog']},nav);
 s.raid.animals.forEach(a=>a.hitsRemaining=0);let saves=0;
 for(let i=0;i<100&&s.raid;i++){const event=advance(s,.1,repo);if(event){assert.equal(event.type,'RaidEnded');saves++;}}
 assert.equal(s.raid,null);assert.equal(saves,1);const loaded=repo.load(s.slotId);
 assert.equal(loaded.raid,null);assert.equal(loaded.events.filter(e=>e.type==='RaidEnded').length,1);
 assert.equal(loaded.tasks.filter(t=>t.kind==='initial').length,1);const writes=store.writes;advance(s,.1,repo);assert.equal(store.writes,writes);
});
test('economic defeat at dawn saves the terminal state even though no hiring Dawn is emitted',()=>{
 const s=farm(),store=storage(),repo=new SaveRepository(store);s.ledger.balance=rational(0);s.time=599.9;s.nightPlan={done:true,group:[]};
 assert.equal(advance(s,.1,repo).type,'GameOver');assert.equal(repo.load(s.slotId).result,'defeat');
 assert.equal(s.events.filter(e=>e.type==='Dawn').length,0);const writes=store.writes;advance(s,1,repo);assert.equal(store.writes,writes);
});
test('hundredth-night victory saves the final outcome once rather than waiting for a hiring Dawn',()=>{
 const s=farm(),store=storage(),repo=new SaveRepository(store);s.day=100;s.completedNights=99;s.postgame=false;s.time=599.9;s.nightPlan={done:true,group:[]};
 assert.equal(advance(s,.1,repo).type,'CampaignWon');const loaded=repo.load(s.slotId);
 assert.equal(loaded.result,'victory');assert.equal(loaded.completedNights,100);assert.equal(loaded.day,101);
 const writes=store.writes;advance(s,1,repo);assert.equal(store.writes,writes);
});
test('purchase and return-to-menu snapshots preserve the current slot and command identities',()=>{
 const s=farm(),other=farm('autosave-b'),store=storage(),repo=new SaveRepository(store);repo.save(other);const untouched=store.data.get(repo.key(other.slotId));
 Game.placeStructure(s,'wall-purchase',{kind:'wall',material:'adobe',x:15,z:6},nav);assert.equal(saveGame(s,repo),true);
 const bought=repo.load(s.slotId);assert.equal(bought.structures.length,2);assert.ok(Object.hasOwn(bought.ledger.entries,'wall-purchase'));
 Game.pause(s,'menu');assert.equal(saveGame(s,repo),true);const loaded=repo.load(s.slotId);
 assert.deepEqual(loaded.pauses,['menu']);assert.equal(loaded.slotId,s.slotId);assert.equal(serialize(loaded),serialize(s));
 assert.equal(store.data.get(repo.key(other.slotId)),untouched);
});
