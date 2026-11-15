import test from 'node:test';
import assert from 'node:assert/strict';
import {commitAgriculturalPower,previewMultiplyPowerSettlement,settleMultiplyPower} from '../src/simulation/agricultural-power.js';
import {rational,numberOf} from '../src/simulation/money.js';
import * as Game from '../src/simulation/game.js';
import {nativeTaskConsequenceFixture} from './helpers/native-task-consequence.js';

function fixture(){
 const s={day:1,plants:[],crates:[],spells:[]},crate=()=>{const plant={};commitAgriculturalPower(s,plant,'multiply',11);return {multiplyPower:plant.multiplyPower};};
 return {s,crate};
}

test('preparing delivery power leaves accounts and entitlement untouched and owns its immutable data',()=>{
 const f=fixture(),crate=f.crate(),before=JSON.stringify({s:f.s,crate}),power=crate.multiplyPower,preview=previewMultiplyPowerSettlement(f.s,crate);
 assert(preview.applies);assert.equal(preview.authorizedConsequences,false);assert.deepEqual(previewMultiplyPowerSettlement(f.s,crate),preview);assert.equal(JSON.stringify({s:f.s,crate}),before);assert.equal(Object.isFrozen(power),false);assert.equal(Object.isFrozen(power.amount),false);assert(Object.isFrozen(preview.account));assert(Object.isFrozen(preview.account.liquidated));assert.throws(()=>{preview.account.liquidated.n='0';},TypeError);
 assert.deepEqual(settleMultiplyPower(f.s,crate),preview.extraIncome);assert.deepEqual(f.s.agriculturalPower.days[1].multiply.liquidated,preview.account.liquidated);assert.deepEqual(f.s.agriculturalPower.days[1].multiply.consumed,preview.account.consumed);assert.equal(f.s.agriculturalPower.days[1].multiply.paid,preview.account.paid);assert.equal(crate.multiplyPower,power);
});

test('a peer delivery changes the prepared fractional settlement, while unrelated state does not',()=>{
 const f=fixture(),first=f.crate(),second=f.crate(),preview=previewMultiplyPowerSettlement(f.s,second);f.s.day=2;f.s.elapsed=999;f.s.plants.push({id:'unrelated'});assert.deepEqual(previewMultiplyPowerSettlement(f.s,second),preview);
 settleMultiplyPower(f.s,first);const next=previewMultiplyPowerSettlement(f.s,second);assert.notDeepEqual(next,preview);assert.equal(numberOf(next.extraIncome),numberOf(preview.extraIncome),'equal whole coins do not make the prior fractional account current');assert.equal(next.day,1);assert.deepEqual(settleMultiplyPower(f.s,second),next.extraIncome);assert.equal(numberOf(settleMultiplyPower(f.s,second)),0);assert.equal(previewMultiplyPowerSettlement(f.s,second).applies,false);
});

test('two hundred delivery previews preserve the existing exact budget and cannot consume it early',()=>{
 const f=fixture();let paid=0;
 for(let i=0;i<200;i++){const crate=f.crate(),before=JSON.stringify({s:f.s,crate}),preview=previewMultiplyPowerSettlement(f.s,crate);assert.equal(JSON.stringify({s:f.s,crate}),before);assert.deepEqual(settleMultiplyPower(f.s,crate),preview.extraIncome);paid+=numberOf(preview.extraIncome);}
 assert.equal(paid,124);assert.equal(f.s.agriculturalPower.days[1].multiply.paid,'124');
});

test('absent, previously settled and invalid delivery power never creates or changes an account during preparation',()=>{
 for(const crate of [{},{multiplyPower:{day:1,amount:rational(10)},multiplyPowerSettled:true}]){const s={day:1},before=JSON.stringify({s,crate}),preview=previewMultiplyPowerSettlement(s,crate);assert.equal(preview.applies,false);assert.equal(numberOf(preview.extraIncome),0);assert.equal(preview.account,null);assert.equal(JSON.stringify({s,crate}),before);}
 const s={day:1},crate={multiplyPower:{day:1,amount:rational(1)}},before=JSON.stringify({s,crate});assert.throws(()=>previewMultiplyPowerSettlement(s,crate),/excede lo comprometido/);assert.equal(JSON.stringify({s,crate}),before);assert.throws(()=>settleMultiplyPower(s,crate),/excede lo comprometido/);assert.equal(JSON.stringify({s,crate}),before);
});

function delivery(){
 const s=Game.newGame({seed:712}),center={id:'center-1',kind:'center',status:'intact',x:0,z:0,yaw:0},w={id:'worker-2',profile:'youngMale',centerId:center.id,status:'carrying',crateId:'crate-3',contractDay:s.day},crate={id:w.crateId,species:'mijo',sourcePlantId:'plant-4',carrierId:w.id,centerId:center.id,delivered:false,value:rational(11)};s.workers=[w];s.crates=[crate];s.structures=[center];s.time=100;s.tutorial.step='harvest';
 return {s,w,crate,center,prepare:()=>Game.prepareCrateDeliveryConsequence(s,w,crate,center),current:preview=>Game.crateDeliveryConsequenceCurrent(s,w,crate,center,preview)};
}

test('delivery data predicts income, contract and tutorial effects without settling or freezing live state',()=>{
 const f=delivery(),before=JSON.stringify(f.s),preview=f.prepare();assert(preview);assert.equal(preview.status,'idle');assert.equal(numberOf(preview.income),11);assert.equal(preview.tutorial.completedEvent,true);assert.equal(preview.tutorial.step,'done');assert.equal(preview.authorizedConsequences,false);assert(f.current(preview));assert.equal(JSON.stringify(f.s),before);assert.equal(Object.isFrozen(f.crate.value),false);assert.equal(Object.isFrozen(f.center),false);assert(Object.isFrozen(preview.center));assert(Object.isFrozen(preview.baseValue));
 f.s.elapsed=900;f.s.nextId++;f.s.ledger.entries.other=rational(2);assert(f.current(preview));f.s.tutorial.basicSkipped=true;assert.equal(f.current(preview),false);const skipped=f.prepare();assert.equal(skipped.tutorial.completedEvent,false);f.s.time=999;assert.equal(f.prepare().status,'returning');assert.equal(f.current(skipped),false);
});

test('delivery preview rejects changed crop value, center, ownership and already credited delivery',()=>{
 for(const mutate of [f=>{f.crate.value=rational(12);},f=>{f.center.x++;},f=>{f.center.status='ruin';},f=>{f.crate.carrierId='worker-9';},f=>{f.w.crateId=null;},f=>{f.crate.delivered=true;},f=>{f.s.ledger.entries['deliver:'+f.crate.id]=rational(11);}]){const f=delivery(),preview=f.prepare();mutate(f);assert.equal(f.current(preview),false);}
});

test('a real native Carry arrival retains the crate and money while its delivery consequence is only prepared',()=>{
 const f=nativeTaskConsequenceFixture();try{const proposed=f.prepare();assert.equal(proposed.status,'proposed');assert.equal(f.commitSourceOnly(proposed.proposal),1);Game.projectNativeHarvestConsequence(f.state,f.worker,f.preview,f.planner);f.advance(proposed.proposal.endTime+.05-f.state.elapsed);assert(f.planner.projectNativeDeliveryExecution(f.state,f.worker).arrived);const crate=f.state.crates[0],center=f.state.structures.find(c=>c.id===f.worker.centerId),before=JSON.stringify(f.state),preview=Game.prepareCrateDeliveryConsequence(f.state,f.worker,crate,center);assert(preview);assert.equal(preview.authorizedConsequences,false);assert(Game.crateDeliveryConsequenceCurrent(f.state,f.worker,crate,center,preview));assert.equal(JSON.stringify(f.state),before);assert.equal(crate.delivered,false);assert.equal(f.worker.crateId,crate.id);assert.equal(Object.hasOwn(f.state.ledger.entries,'deliver:'+crate.id),false);
 }finally{f.close();}
});
