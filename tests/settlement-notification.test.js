import test from 'node:test';
import assert from 'node:assert/strict';
import {transact,rational,numberOf} from '../src/simulation/money.js';
import {observeSettlements,notifySettlement} from '../src/simulation/settlement-observers.js';

test('ordinary settlement observers still run once after the rounded ledger entry is committed',()=>{
 const ledger={balance:rational(20),entries:{}},seen=[],stop=observeSettlements(ledger,(id,n,d)=>{assert.equal(numberOf(ledger.balance),23);assert.deepEqual(ledger.entries[id],rational(3));seen.push({id,n,d});});
 try{assert(transact(ledger,'ordinary',rational(5,2)));assert.equal(transact(ledger,'ordinary',rational(9)),false);assert.deepEqual(seen,[{id:'ordinary',n:'3',d:'1'}]);}finally{stop();}
});

test('an owner can capture the one rounded notification and dispatch it after its related source state is coherent',()=>{
 const ledger={balance:rational(20),entries:{}},source={delivered:false},seen=[],stop=observeSettlements(ledger,id=>{assert(source.delivered);assert.equal(numberOf(ledger.balance),23);seen.push(id);});let captured=null,calls=0;
 try{assert(transact(ledger,'delivery',rational(5,2),{notify:(value,id,delta)=>{calls++;assert.equal(value,ledger);assert.deepEqual(delta,rational(3));captured={id,delta};}}));assert.deepEqual(seen,[]);assert.equal(calls,1);assert.equal(transact(ledger,'delivery',rational(99),{notify:()=>{calls++;}}),false);assert.equal(calls,1);source.delivered=true;notifySettlement(ledger,captured.id,captured.delta);assert.deepEqual(seen,['delivery']);}finally{stop();}
});

test('invalid notification configuration and insufficient funds cannot partially settle a transaction',()=>{
 const ledger={balance:rational(2),entries:{}},before=JSON.stringify(ledger);let notified=false;
 assert.throws(()=>transact(ledger,'invalid',rational(1),{notify:null}),/Invalid settlement notification/);assert.equal(JSON.stringify(ledger),before);
 assert.throws(()=>transact(ledger,'debit',rational(-3),{notify:()=>{notified=true;}}),/Fondos insuficientes/);assert.equal(notified,false);assert.equal(JSON.stringify(ledger),before);
});
