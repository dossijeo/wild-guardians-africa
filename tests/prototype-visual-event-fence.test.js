import test from 'node:test';import assert from 'node:assert/strict';import {createVisualEventFence} from '../tools/trees/prototype_visual_event_fence.mjs';
const classify=e=>e.type==='wall'?'structural':e.type==='sound'?'visual':'unknown';
test('structural changes hide stale presentation and release ordered visual effects at a compatible pose',()=>{
 const f=createVisualEventFence('s',{classify});assert.equal(f.receive({session:'s',sequence:1,firstEvent:0,events:[{type:'sound',id:1}]}).accepted,true);assert.deepEqual(f.present(1,()=>{}).events,[{type:'sound',id:1}]);
 const event={type:'wall',id:2},r=f.receive({session:'s',sequence:2,firstEvent:1,events:[event,{type:'sound',id:3}]});event.id=9;assert.equal(r.hide,true);assert.deepEqual(r.urgent,[{type:'wall',id:2}]);assert.equal(f.present(1,()=>{}).reason,'invalidated');assert.equal(f.state().hide,true);assert.deepEqual(f.present(2,()=>{}),{accepted:true,events:[{type:'wall',id:2},{type:'sound',id:3}],hide:false});assert.equal(f.state().hide,false);
});
test('sequence errors, unknown events and overflow fail closed without admitting events',()=>{
 const make=()=>createVisualEventFence('s',{classify,capacity:1});let f=make();assert.equal(f.receive({session:'other',sequence:1,firstEvent:0,events:[]}).reason,'session');assert.equal(f.state().fault,false);assert.equal(f.receive({session:'s',sequence:2,firstEvent:0,events:[]}).reason,'order');assert.equal(f.state().hide,true);assert.equal(f.present(0,()=>{}).reason,'fault');
 f=make();assert.throws(()=>f.receive({session:'s',sequence:1,firstEvent:0,events:[{type:'invalid'}]}));assert.equal(f.state().nextEvent,0);assert.equal(f.state().hide,true);
 f=make();assert.equal(f.receive({session:'s',sequence:1,firstEvent:0,events:[{type:'sound'}]}).accepted,true);assert.equal(f.receive({session:'s',sequence:2,firstEvent:1,events:[{type:'wall'}]}).reason,'capacity');assert.equal(f.state().hide,true);assert.equal(f.present(1,()=>{}).reason,'fault');
});
test('coalesced poses release all pending events in source order',()=>{
 const f=createVisualEventFence('s',{classify});for(let i=1;i<=4;i++)assert.equal(f.receive({session:'s',sequence:i,firstEvent:i-1,events:[{type:i===3?'wall':'sound',id:i}]}).accepted,true);assert.equal(f.state().hide,true);assert.deepEqual(f.present(4,()=>{}).events.map(e=>e.id),[1,2,3,4]);assert.equal(f.state().pending,0);assert.equal(f.present(3,()=>{}).reason,'order');
});

test('presentation callback failure retains pending events and closes the session',()=>{
 const f=createVisualEventFence('s',{classify});f.receive({session:'s',sequence:1,firstEvent:0,events:[{type:'wall',id:1},{type:'sound',id:2}]});let partial=0;assert.throws(()=>f.present(1,events=>{partial++;assert.equal(events.length,2);throw Error('draw failed');}),/draw failed/);assert.equal(partial,1);assert.equal(f.state().pending,2);assert.equal(f.state().displayed,0);assert.equal(f.state().hide,true);assert.equal(f.present(1,()=>{}).reason,'fault');
});
test('presentation blocks reentrant and asynchronous state transitions',()=>{
 let f=createVisualEventFence('s',{classify});f.receive({session:'s',sequence:1,firstEvent:0,events:[]});assert.throws(()=>f.present(1,()=>f.receive({session:'s',sequence:2,firstEvent:0,events:[]})),/Reentrant/);assert.equal(f.state().hide,true);assert.equal(f.state().received,1);
 f=createVisualEventFence('s',{classify});f.receive({session:'s',sequence:1,firstEvent:0,events:[]});assert.throws(()=>f.present(1,()=>Promise.resolve()),/Async/);assert.equal(f.state().displayed,0);assert.equal(f.state().hide,true);
});
