import test from 'node:test';
import assert from 'node:assert/strict';
import {createPresentationInputRouter} from '../src/simulation/presentation-input-router.js';

test('input IDs restart per graphical stream without misrouting a late result',async()=>{
 const pending=[],errors=[],makeStream=name=>({detached:false,status(){return {detached:this.detached};},sendInputFailure(id,error){errors.push({name,id,message:error.message});}});
 const old=makeStream('old'),replacement=makeStream('new');
 const router=createPresentationInputRouter({isAllowed:()=>true,submit(command,id){let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});pending.push({command,id,resolve,reject});return promise;}});
 const before=router.forStream(()=>old),after=router.forStream(()=>replacement);
 before({id:1,command:{name:'before'}});old.detached=true;after({id:1,command:{name:'after'}});
 assert.deepEqual(pending.map(item=>item.id),[1,2]);
 assert.equal(router.receipt(1,replacement),undefined);
 assert.equal(router.receipt(1,old),undefined);
 assert.equal(router.receipt(2,replacement),1);
 pending[0].reject(Error('old error'));await Promise.resolve();
 assert.deepEqual(errors,[{name:'old',id:1,message:'old error'}]);
 assert.equal(router.receipt(2,replacement),1);
 pending[1].resolve();await Promise.resolve();assert.equal(router.receipt(2,replacement),undefined);
});

test('duplicates and invalid commands are rejected only on their own stream',()=>{
 const errors=[],calls=[],stream={status:()=>({detached:false}),sendInputFailure:(id,error)=>errors.push([id,error.message])};
 const router=createPresentationInputRouter({isAllowed:command=>command?.kind==='ok',submit:(command,id)=>{calls.push(id);return new Promise(()=>{});}}),input=router.forStream(()=>stream);
 input({id:1,command:{kind:'bad'}});input({id:1,command:{kind:'ok'}});input({id:2,command:{kind:'ok'}});
 assert.deepEqual(calls,[1]);assert.deepEqual(errors,[[1,'Invalid presentation input command'],[1,'Stale presentation input']]);
 router.clear();assert.equal(router.receipt(1,stream),undefined);
});
