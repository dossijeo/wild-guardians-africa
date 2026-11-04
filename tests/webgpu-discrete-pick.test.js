import test from 'node:test';
import assert from 'node:assert/strict';
import {createWebGpuDiscretePick} from '../src/app/webgpu-discrete-pick.js';

const flush=()=>new Promise(resolve=>setImmediate(resolve));
function setup(){let resolve,reject,current;const delivered=[],errors=[],calls=[];
 const client={pick:coordinate=>{calls.push(coordinate);return new Promise((a,b)=>{resolve=a;reject=b;});}};
 const owner={},state={},tool={kind:'spell',spell:'attack'};
 current={owner,state,tool,client,canvas:{getBoundingClientRect:()=>({left:10,top:20,width:200,height:100})},sync:()=>calls.push('sync')};
 const pick=createWebGpuDiscretePick({context:()=>current,deliver:value=>delivered.push(value),onError:error=>errors.push(error.message)});
 return {pick,delivered,errors,calls,get current(){return current;},set current(value){current=value;},resolve:value=>resolve(value),reject:error=>reject(error)};
}
test('spell click uses Worker coordinates and preserves gesture',async()=>{const s=setup();assert.equal(s.pick({clientX:110,clientY:45},{gestureSeconds:.2}),true);await flush();assert.deepEqual(s.calls,['sync',{x:0,y:.5}]);s.resolve({entityId:'beast',point:null,sequence:8});await flush();assert.deepEqual(s.delivered,[{entityId:'beast',point:null,sequence:8,gestureSeconds:.2}]);});
test('unsupported tools and unavailable Worker keep the existing input path',()=>{const s=setup();s.current={...s.current,tool:{kind:'wall'}};assert.equal(s.pick({clientX:100,clientY:50},{}),false);s.current=null;assert.equal(s.pick({clientX:100,clientY:50},{}),false);assert.deepEqual(s.calls,[]);});
test('discard a response after changing tool or game',async()=>{for(const field of ['tool','state','owner','client']){const s=setup();s.pick({clientX:110,clientY:45},{});await flush();s.current={...s.current,[field]:{}};s.resolve({entityId:'old',sequence:8});await flush();assert.deepEqual(s.delivered,[],field);}});
test('discard stale camera or superseded picks and report other errors',async()=>{const s=setup();s.pick({clientX:110,clientY:45},{});await flush();s.reject(Error('Stale WebGPU pick'));await flush();assert.deepEqual(s.errors,[]);s.pick({clientX:110,clientY:45},{});await flush();s.reject(Error('Device lost'));await flush();assert.deepEqual(s.errors,['Device lost']);});
