import test from 'node:test';
import assert from 'node:assert/strict';
import {selectToolWithPreparation} from '../src/app/select-tool-with-preparation.js';

test('tool selection does not wait for resource preparation',async()=>{
 let reject,selected=false;const errors=[];selectToolWithPreparation({select(){selected=true;},prepare:()=>new Promise((_,fail)=>{reject=fail;}),onError:error=>errors.push(error.message)});
 assert.equal(selected,true);assert.deepEqual(errors,[]);reject(Error('unavailable'));await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(errors,['unavailable']);
});
test('a late failure cannot affect a superseded tool or world',async()=>{
 let reject,current=true;const errors=[];selectToolWithPreparation({select(){},prepare:()=>new Promise((_,fail)=>{reject=fail;}),isCurrent:()=>current,onError:error=>errors.push(error.message)});current=false;reject(Error('stale'));await new Promise(resolve=>setImmediate(resolve));assert.deepEqual(errors,[]);
});
test('synchronous resource failures do not prevent selection and are reported once',()=>{
 const calls=[];selectToolWithPreparation({select:()=>calls.push('selected'),prepare(){throw Error('failed');},onError:error=>calls.push(error.message)});assert.deepEqual(calls,['selected','failed']);
});
