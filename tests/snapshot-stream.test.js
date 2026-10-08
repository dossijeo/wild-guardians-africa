import test from 'node:test';
import assert from 'node:assert/strict';
import {snapshotStream,SnapshotAssembly} from '../src/persistence/snapshot-stream.js';
import {newGame} from '../src/simulation/game.js';
import {decodeSnapshotAsync} from '../src/persistence/snapshot-decoder.js';

test('message-sized delivery preserves order, unknown JSON fields and all data while releasing acknowledged references',()=>{
 const state=newGame({seed:712});
 state.plants=Array.from({length:1300},(_,i)=>({id:'stream-'+i,species:'maiz',alive:true,growth:i%100,x:i,z:2}));
 state['ledger.entries']=[1,2,3];
 Object.defineProperty(state.ledger.entries,'__proto__',{value:{n:'0',d:'1'},enumerable:true,configurable:true,writable:true});
 for(let i=0;i<1300;i++)state.ledger.entries['zero-'+i]={n:'0',d:'1'};
 const expected=structuredClone(state),stream=snapshotStream(state),receiver=new SnapshotAssembly(structuredClone({header:stream.header,lengths:stream.lengths,entries:stream.entries}));
 let sequence=0;
 for(const chunk of stream.chunks){receiver.accept({...structuredClone(chunk),sequence:sequence++});}
 assert.deepEqual(receiver.complete(sequence),expected);
 assert.ok(state.plants.every(value=>value===null));assert.deepEqual(Object.keys(state.ledger.entries),[]);
 assert.equal(Object.getPrototypeOf(receiver.state.ledger.entries),Object.prototype);
 assert.ok(Object.hasOwn(receiver.state.ledger.entries,'__proto__'));
});

test('small saves preserve the single-message path',()=>assert.equal(snapshotStream(newGame({seed:712})),null));

test('partial, duplicate and out-of-order results cannot complete',()=>{
 const state=newGame({seed:712});state.plants=[{id:'a'},{id:'b'}];
 const stream=snapshotStream(state,{threshold:0});
 const header=structuredClone({header:stream.header,lengths:stream.lengths,entries:stream.entries});
 const receiver=new SnapshotAssembly(header);
 assert.throws(()=>receiver.complete(0),/Incomplete/);
 assert.throws(()=>receiver.accept({sequence:1,kind:'array',key:'plants',offset:0,items:[{id:'a'}]}),/Out-of-order/);
 assert.throws(()=>receiver.accept({sequence:0,kind:'array',key:'plants',offset:1,items:[{id:'a'}]}),/Invalid/);
 receiver.accept({sequence:0,kind:'array',key:'plants',offset:0,items:[{id:'a'}]});
 assert.throws(()=>receiver.accept({sequence:1,kind:'array',key:'plants',offset:0,items:[{id:'a'}]}),/Invalid/);
 assert.throws(()=>receiver.complete(1),/Incomplete/);
});

for(const reason of ['abort','timeout'])test('stream '+reason+' cancels a held RAF without late acknowledgement or partial adoption',async t=>{
 let clock=0;t.mock.method(performance,'now',()=>clock+=7);
 const worker={sent:[],terminated:0,postMessage(value){this.sent.push(value);},terminate(){this.terminated++;}},controller=new AbortController();
 const pending=decodeSnapshotAsync('text',{workerAvailable:true,createWorker:()=>worker,signal:controller.signal,timeout:reason==='timeout'?10:1000,nextFrame:()=>new Promise(()=>{})});
 const state=newGame({seed:712}),stream=snapshotStream({...state,plants:[{}]},{threshold:0});
 const held=worker.onmessage({data:{type:'snapshot-start',header:stream.header,lengths:stream.lengths,entries:stream.entries}});
 if(reason==='abort')controller.abort();
 await assert.rejects(pending,{name:reason==='abort'?'AbortError':'TimeoutError'});await held;
 assert.deepEqual(worker.sent,[{type:'decode-snapshot',text:'text'}]);assert.equal(worker.terminated,1);assert.equal(worker.onmessage,null);
});
