import test from 'node:test';
import assert from 'node:assert/strict';
import * as Game from '../src/simulation/game.js';
import {createPlant} from '../src/simulation/crops.js';
import {cropSpec} from '../src/simulation/rules.js';
import {rational,numberOf} from '../src/simulation/money.js';
import {awakeningState} from '../src/simulation/awakenings.js';
import {microState,reserveEvent,settleEvent,harvestMicroLoss,previewHarvestMicroLoss} from '../src/microevents/economy.js';
import {Navigation} from '../src/world/navigation.js';
import {nativeActionSave,restoreNativeActionGame} from './helpers/native-task-action-restoration.js';
import {createNativeAdmissionVertical} from './helpers/native-admission-vertical.js';

function fixture({profile='olderMale',loss=1,blessing=true}={}){
 const s=Game.newGame({seed:712,slotId:'harvest-consequence'}),p=createPlant('plant-2','mijo',0,0,'structure-1');p.growth=cropSpec('mijo').growth_seconds;p.harvestRequested=true;p.harvestBonus=30;p.multiplyHarvest=true;
 const w={id:'worker-3',centerId:'structure-1',profile,x:0,z:0,status:'acting',taskId:'task-4',crateId:null},t={id:'task-4',centerId:w.centerId,kind:'harvest',targetId:p.id,workerId:w.id,created:0};
 s.plants=[p];s.workers=[w];s.tasks=[t];s.nextId=5;
 if(blessing){const source=createPlant('plant-6','mijo',1,0,'structure-1');source.blessing={};s.plants.push(source);awakeningState(s).total=1;}
 if(loss){const m=microState(s);m.previousIncome=10000;m.pendingLosses[p.id]=loss;}
 return {s,w,t,p,prepare:()=>Game.prepareHarvestConsequence(s,w,t,p),current:preview=>Game.harvestConsequenceCurrent(s,w,t,p,preview)};
}

test('preparing harvest data repeatedly leaves crop, power, money, IDs, events and loss allowance untouched',()=>{
 const f=fixture(),power={day:1,amount:rational(132,13)};f.p.multiplyPower=power;
 const before=JSON.stringify(f.s),preview=f.prepare();assert(preview);assert.equal(preview.authorizedConsequences,false);assert.deepEqual(f.prepare(),preview);assert(f.current(preview));assert.equal(JSON.stringify(f.s),before);
 assert.equal(f.p.multiplyPower,power);assert.notEqual(preview.crate.multiplyPower,power);assert(Object.isFrozen(preview.crate.multiplyPower.amount));assert(Object.isFrozen(preview.crate.blessingSourceIds));assert.equal(Object.isFrozen(power),false);assert.equal(Object.isFrozen(power.amount),false);
 assert.throws(()=>{preview.crate.multiplyPower.amount.n='999';},TypeError);assert.equal(JSON.stringify(f.s),before);
});

for(const profile of ['olderMale','youngMale','olderFemale','youngFemale'])test(`${profile}: preview preserves ordinary bonuses then applies the whole-coin micro loss`,()=>{
 const f=fixture({profile}),preview=f.prepare();assert.equal(numberOf(preview.baseValue),profile.endsWith('Female')?30.6:36.32);assert.equal(numberOf(preview.crate.value),profile.endsWith('Female')?30:36);assert.equal(numberOf(preview.crate.blessingBonus),2);assert.deepEqual(preview.crate.blessingSourceIds,['plant-6']);assert.equal(preview.microLoss.applied,1);assert.equal(preview.crate.id,'crate-5');assert.equal(f.s.nextId,5);assert.equal(f.s.microevents.pendingLosses[f.p.id],1);assert.equal(f.s.microevents.settledDay,undefined);
});

test('committed Multiply power is copied for preparation and is never multiplied a second time',()=>{
 const f=fixture();f.p.multiplyPower={day:1,amount:rational(132,13)};const preview=f.prepare();assert.equal(numberOf(preview.baseValue),19.16);assert.equal(numberOf(preview.crate.value),19);assert.deepEqual(preview.crate.multiplyPower,f.p.multiplyPower);assert(f.current(preview));assert.equal(f.s.crates.length,0);
});

test('a preview without a reserved loss preserves fractional value and creates no microevent state',()=>{
 const f=fixture({loss:0,blessing:false}),before=JSON.stringify(f.s),preview=f.prepare();assert.equal(numberOf(preview.crate.value),34.32);assert.equal(preview.microLoss.pendingLoss,0);assert.equal(f.s.microevents,undefined);assert.equal(JSON.stringify(f.s),before);assert.equal(numberOf(harvestMicroLoss(f.s,f.p,preview.baseValue)),34.32);assert.equal(f.s.microevents,undefined);
 const m=microState(f.s);m.pendingLosses[f.p.id]=1;m.previousIncome=0;const capped=f.prepare();assert.equal(numberOf(capped.crate.value),34.32);let losses=0;assert.equal(numberOf(harvestMicroLoss(f.s,f.p,capped.baseValue,()=>losses++)),34.32);assert.equal(losses,0);assert.equal(m.pendingLosses[f.p.id],undefined);assert.equal(m.settledLoss,0);
});

test('only consequence inputs invalidate a harvest preview; unrelated movement and elapsed time do not',()=>{
 const f=fixture(),preview=f.prepare();f.s.elapsed+=100;f.s.workers.push({id:'worker-99',x:500,z:500});f.s.workers[1].x+=10;f.p.growth+=100;assert(f.current(preview));
 for(const change of [f=>{f.s.nextId++;},f=>{f.p.harvestBonus++;},f=>{f.w.x+=.1;},f=>{f.w.centerId='structure-77';},f=>{f.w.profile='olderFemale';},f=>{f.s.day++;},f=>{f.s.microevents.pendingLosses[f.p.id]=2;}]){
  const separate=fixture(),original=separate.prepare();change(separate);assert.equal(separate.current(original),false);
 }
});

test('lost task ownership, target or maturity prevents a consequence preview',()=>{
 for(const alter of [f=>{f.t.workerId='worker-99';},f=>{f.w.taskId=null;},f=>{f.t.targetId='plant-99';},f=>{f.p.harvestRequested=false;},f=>{f.p.alive=false;},f=>{f.p.growth=0;},f=>{f.w.crateId='crate-99';}]){const f=fixture(),preview=f.prepare();alter(f);assert.equal(f.prepare(),null);assert.equal(f.current(preview),false);assert.equal(f.s.crates.length,0);}
});

test('another harvest consuming the daily loss allowance makes the old consequence data stale',()=>{
 const f=fixture({loss:2}),preview=f.prepare(),m=f.s.microevents;m.pendingLosses['plant-99']=2;
 assert.equal(numberOf(harvestMicroLoss(f.s,{id:'plant-99'},rational(10))),8);assert.equal(f.current(preview),false);const next=f.prepare();assert.equal(next.microLoss.applied,0);assert.equal(numberOf(next.crate.value),36.32);assert.equal(m.pendingLosses[f.p.id],2);assert.equal(m.settledLoss,2);
});

for(const sameDay of [false,true])test(`micro-loss preview does not reset or consume the ${sameDay?'current':'previous'} day's allowance`,()=>{
 const f=fixture({loss:2}),m=f.s.microevents;m.settledDay=sameDay?f.s.day:f.s.day-1;m.settledLoss=2;const before=JSON.stringify(f.s),preview=previewHarvestMicroLoss(f.s,f.p,rational(101,10));assert.equal(JSON.stringify(f.s),before);assert.equal(preview.applied,sameDay?0:2);assert.equal(numberOf(harvestMicroLoss(f.s,f.p,rational(101,10))),sameDay?10.1:9);assert.equal(m.settledDay,f.s.day);assert.equal(m.settledLoss,2);assert.equal(m.pendingLosses[f.p.id],undefined);
});

test('a completed restored native action can expose consequence data but cannot apply its effects',async()=>{
 const f=restoreNativeActionGame(nativeActionSave({progress:3}).saved,{admitPeer:false});let vertical;
 try{vertical=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'task-action'});const result=await vertical.run(options=>f.planner.startNativeTaskActionAfterGpuQuiescence({...options,request:f.planner.nativeTaskActionRequest(f.actor)}));assert.equal(result.status,'committed');await vertical.present();Game.tick(f.state,.01,f.nav);
  const w=f.worker,t=f.state.tasks.find(t=>t.id===w.taskId),p=f.state.plants.find(p=>p.id===t.targetId),binding=f.planner.nativeTaskActionBinding(f.actor),body=f.body(1),before=JSON.stringify(f.state),preview=Game.prepareHarvestConsequence(f.state,w,t,p);assert(preview);assert.equal(preview.authorizedConsequences,false);assert.equal(JSON.stringify(f.state),before);assert(f.planner.nativeTaskActionExecution(f.actor).completed);
  Game.tick(f.state,.2,f.nav);assert.equal(f.state.crates.length,0);assert(p.alive&&p.harvestRequested);assert.equal(w.taskId,t.id);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeTaskActionBinding(f.actor),binding);assert(!f.state.events.some(e=>e.type==='CropPicked'));
 }finally{await vertical?.close();f.close();}
});

test('the ordinary Game completion consumes the same prepared consequence exactly once without early payment',()=>{
 const s=Game.newGame({seed:712,slotId:'ordinary-harvest-consequence'}),nav=new Navigation(712,'sabana',{});nav.field={blocked:()=>false,slope:()=>0,surface:()=>0};nav.propsAt=()=>[];nav.setState(s);
 Game.placeStructure(s,'center',{x:-12,z:0},nav);Game.plant(s,'banana','platano',8,4,nav);Game.openInitialHiring(s);Game.hire(s,'hire',{olderMale:1});
 s.day=101;s.completedNights=100;s.postgame=true;s.dayPlan={done:true};s.tutorial.step='done';s.initialPreparation=false;
 const w=s.workers[0],p=s.plants[0];Object.assign(w,{contractDay:101,status:'idle',x:7.4,z:4,path:null});p.water.forEach(w=>{w.status='manual';});p.growth=cropSpec(p.species).growth_seconds-.05;p.harvestBonus=30;
 Game.cast(s,'multiply','multiply',p.x,p.z,nav);microState(s).previousIncome=10000;assert.equal(settleEvent(s,reserveEvent(s,'birds',p.id),'ignored').reservedLoss,1);
 const harvesting=()=>w.status==='acting'&&s.tasks.find(t=>t.id===w.taskId)?.kind==='harvest';for(let i=0;i<1200&&!harvesting();i++)Game.tick(s,.05,nav);assert(harvesting());const t=s.tasks.find(t=>t.id===w.taskId),preview=Game.prepareHarvestConsequence(s,w,t,p),cash=structuredClone(s.ledger),power=p.multiplyPower,nextId=s.nextId,events=s.events.length;
 assert(preview);assert.equal(s.crates.length,0);assert.equal(s.microevents.pendingLosses[p.id],1);assert(Game.harvestConsequenceCurrent(s,w,t,p,preview));let atEffect;const stop=Game.observeGameEvents(s,event=>{if(event.type==='CropPicked')atEffect=structuredClone(s.crates[0]);});try{Game.tick(s,w.actionRemaining+.001,nav);}finally{stop();}
 assert.equal(s.crates.length,1);assert.deepEqual(atEffect,preview.crate);assert.equal(s.crates[0].x,w.x);assert.equal(s.crates[0].z,w.z);assert.equal(s.crates[0].multiplyPower,power);assert.equal(p.multiplyPower,undefined);assert.equal(p.alive,false);assert.equal(s.nextId,nextId+1);assert.deepEqual(s.ledger,cash);assert.equal(s.microevents.pendingLosses[p.id],undefined);assert.equal(s.events.slice(events).filter(e=>e.type==='MicroeventHarvestLossApplied').length,1);assert.equal(s.events.slice(events).filter(e=>e.type==='CropPicked').length,1);assert.equal(Game.harvestConsequenceCurrent(s,w,t,p,preview),false);
 Game.tick(s,.2,nav);assert.equal(s.crates.length,1);assert.equal(s.events.slice(events).filter(e=>e.type==='CropPicked').length,1);
});
