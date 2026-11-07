import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {spawnRaid} from '../src/simulation/raids.js';
import {rational} from '../src/simulation/money.js';
import {SaveRepository,serialize} from '../src/persistence/snapshots.js';
import {autosaveEventAfter,autosaveConfirmedEvents,createConfirmedAutosaveController} from '../src/app/autosave-events.js';
import {saveGame} from '../src/app/save-game.js';
import {createWorkerSaveCoordinator} from '../src/persistence/worker-save.js';

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
test('confirmed batches request one autosave for any boundary and none for unrelated events',()=>{
 let saves=0;const save=()=>++saves;assert.equal(autosaveConfirmedEvents([{type:'WaterSatisfied'}],save),false);for(const type of ['Dawn','RaidEnded','CampaignWon','GameOver'])assert.equal(autosaveConfirmedEvents([{type},{type}],save),saves);assert.equal(saves,4);assert.throws(()=>autosaveConfirmedEvents(null,save),/confirmed autosave/);
});
test('unavailable Worker autosave waits for confirmed availability before retrying',async()=>{
 const requests=[],errors=[],flush=()=>new Promise(resolve=>setImmediate(resolve)),controller=createConfirmedAutosaveController({request:()=>new Promise(resolve=>requests.push(resolve)),onError:error=>errors.push(error)});controller.observe(true);controller.events([{type:'Dawn'}]);assert.equal(requests.length,1);controller.observe(false);requests[0]({saved:false,reason:'physics-active'});await flush();assert.equal(controller.status().waiting,true);controller.observe(false);assert.equal(requests.length,1);controller.observe(true);assert.equal(requests.length,2);requests[1]({saved:true});await flush();assert.deepEqual(controller.status(),{pending:false,running:false,waiting:false,closed:false});assert.deepEqual(errors,[]);controller.dispose();
});
test('new confirmed boundaries during a save produce one later checkpoint and disposal stops retries',async()=>{
 const requests=[],flush=()=>new Promise(resolve=>setImmediate(resolve)),controller=createConfirmedAutosaveController({request:()=>new Promise(resolve=>requests.push(resolve))});controller.events([{type:'RaidEnded'}]);controller.events([{type:'Dawn'},{type:'GameOver'}]);assert.equal(requests.length,1);requests[0]({saved:true});await flush();assert.equal(requests.length,2);controller.dispose();requests[1]({saved:false,reason:'physics-active'});await flush();controller.observe(true);assert.equal(requests.length,2);assert.equal(controller.status().closed,true);
});
test('a checkpoint failure after availability recovered retries only once',async()=>{
 const requests=[],flush=()=>new Promise(resolve=>setImmediate(resolve)),controller=createConfirmedAutosaveController({request:()=>new Promise(resolve=>requests.push(resolve))});controller.observe(true);controller.events([{type:'Dawn'}]);controller.observe(false);controller.observe(true);requests[0]({saved:false,reason:'physics-active'});await flush();assert.equal(requests.length,2);requests[1]({saved:true});await flush();assert.equal(requests.length,2);controller.dispose();
});
test('storage errors are reported without an automatic retry loop',async()=>{const errors=[],flush=()=>new Promise(resolve=>setImmediate(resolve));let calls=0;const controller=createConfirmedAutosaveController({request:()=>{calls++;return Promise.reject(Error('storage failed'));},onError:error=>errors.push(error.message)});controller.events([{type:'Dawn'}]);await flush();controller.observe(false);controller.observe(true);await flush();assert.equal(calls,1);assert.deepEqual(errors,['storage failed']);controller.dispose();});
test('a later confirmed sequence rearms autosave even if the unavailable interval was not observed',async()=>{const requests=[],flush=()=>new Promise(resolve=>setImmediate(resolve)),controller=createConfirmedAutosaveController({request:()=>new Promise(resolve=>requests.push(resolve))});try{controller.observe(true,10);controller.events([{type:'Dawn'}]);requests[0]({saved:false,reason:'physics-active',sequence:11});await flush();assert.equal(controller.status().waiting,true);controller.observe(true,10);controller.observe(true,11);assert.equal(requests.length,1);controller.observe(true,12);assert.equal(requests.length,2);requests[1]({saved:true,sequence:13});await flush();assert.equal(controller.status().pending,false);}finally{controller.dispose();}});
test('a later available sequence received before the failed save result is not lost',async()=>{const requests=[],flush=()=>new Promise(resolve=>setImmediate(resolve)),controller=createConfirmedAutosaveController({request:()=>new Promise(resolve=>requests.push(resolve))});try{controller.observe(true,10);controller.events([{type:'RaidEnded'}]);controller.observe(true,12);controller.observe(false,11);requests[0]({saved:false,reason:'physics-active',sequence:11});await flush();assert.equal(requests.length,2);requests[1]({saved:false,reason:'physics-active',sequence:13});await flush();controller.observe(true,12);assert.equal(requests.length,2);controller.observe(true,14);assert.equal(requests.length,3);requests[2]({saved:true,sequence:15});await flush();}finally{controller.dispose();}});
test('confirmed autosave persists the next available Worker checkpoint through the real coordinator',async()=>{const state=farm('worker-save'),snapshot=serialize(state),requests=[],writes=[],flush=()=>new Promise(resolve=>setImmediate(resolve)),runtime={submit(command){assert.deepEqual(command,{kind:'snapshot'});return new Promise(resolve=>requests.push(resolve));}},coordinator=createWorkerSaveCoordinator({runtime,repository:{save:async value=>writes.push(value)},slotId:state.slotId,now:()=>123}),controller=createConfirmedAutosaveController({request:()=>coordinator.request()});try{controller.observe(true,10);controller.events([{type:'Dawn'}]);requests[0]({sequence:11,saveAvailable:false,snapshot,raidWaitBindings:[]});await flush();assert.equal(controller.status().waiting,true);assert.equal(writes.length,0);controller.observe(true,12);assert.equal(requests.length,2);requests[1]({sequence:13,saveAvailable:true,snapshot,raidWaitBindings:[]});await flush();assert.equal(writes.length,1);assert.equal(writes[0].slotId,state.slotId);assert.equal(writes[0].savedAt,123);assert.equal(controller.status().pending,false);}finally{controller.dispose();}});
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
test('recovery suspension keeps confirmed autosave boundaries pending until surface publication',async()=>{
 let calls=0;const errors=[],controller=createConfirmedAutosaveController({request:()=>{calls++;return Promise.resolve({saved:true});},onError:error=>errors.push(error)});
 try{controller.observe(true,1);controller.setSuspended(true);controller.events([{type:'RaidEnded'}]);controller.events([{type:'Dawn'}]);controller.observe(true,2);await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,0);assert.equal(controller.status().pending,true);controller.setSuspended(false);await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);assert.equal(controller.status().pending,false);controller.setSuspended(false);assert.equal(calls,1);assert.deepEqual(errors,[]);}finally{controller.dispose();}
});

test('confirmed tutorial changes use the same recovery fence as boundary autosaves',async()=>{
 let calls=0;const controller=createConfirmedAutosaveController({request:()=>{calls++;return Promise.resolve({saved:true});}});
 controller.setSuspended(true);controller.request();controller.events([{type:'Dawn'}]);controller.request();assert.equal(calls,0);assert.equal(controller.status().pending,true);controller.setSuspended(false);await new Promise(resolve=>setImmediate(resolve));assert.equal(calls,1);controller.dispose();assert.equal(controller.request(),false);assert.equal(calls,1);
});
