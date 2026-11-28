import test from 'node:test';
import assert from 'node:assert/strict';
import {createVisibleEventFence} from '../tools/trees/prototype_visible_event_fence.mjs';
const make=()=>{const log=[],f=createVisibleEventFence('s',{classify:e=>e.type==='wall'?'structural':'visual',setVisible:v=>log.push(v?'show':'hide')});return {f,log};};
const batch=(sequence,firstEvent,events)=>({session:'s',sequence,firstEvent,events});
test('structural publication hides immediately, then applies and draws before revealing',()=>{
 const {f,log}=make();f.receive(batch(1,0,[{type:'wall'}]));assert.deepEqual(log,['hide']);assert.equal(f.state().visible,false);
 assert.equal(f.present(0,()=>assert.fail(),()=>assert.fail()).accepted,false);
 f.present(1,events=>{assert.equal(events.length,1);log.push('apply');},()=>log.push('draw'));assert.deepEqual(log,['hide','apply','draw','show']);assert.equal(f.state().visible,true);
});
test('invalid order, application failure and render failure remain hidden',()=>{
 let {f,log}=make();assert.equal(f.receive(batch(2,0,[])).accepted,false);assert.deepEqual(log,['hide']);assert.equal(f.present(0,()=>{},()=>{}).accepted,false);
 for(const failure of ['apply','draw']){({f,log}=make());f.receive(batch(1,0,[{type:'wall'}]));assert.throws(()=>f.present(1,()=>{if(failure==='apply')throw Error(failure);},()=>{if(failure==='draw')throw Error(failure);}),new RegExp(failure));assert.equal(f.state().visible,false);assert.equal(f.state().displayed,0);assert.deepEqual(log,['hide']);}
});
test('visual events do not hide; asynchronous or reentrant drawing fails closed',()=>{
 let {f,log}=make();f.receive(batch(1,0,[{type:'sound'}]));f.present(1,()=>{},()=>{});assert.deepEqual(log,[]);
 for(const draw of [()=>Promise.resolve(),()=>f.receive(batch(2,1,[]))]){({f,log}=make());f.receive(batch(1,0,[{type:'sound'}]));assert.throws(()=>f.present(1,()=>{},draw));assert.deepEqual(log,['hide']);assert.equal(f.state().visible,false);}
});
