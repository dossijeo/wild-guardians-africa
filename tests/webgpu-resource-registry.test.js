import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshBasicMaterial} from 'three';
import {createWebGpuResourceRegistry} from '../src/rendering/webgpu-resource-registry.js';
function asset(){const scene=new Group(),geometry=new BoxGeometry(),material=new MeshBasicMaterial();scene.add(new Mesh(geometry,material));let disposed=0;return {scene,clips:[],get disposed(){return disposed;},dispose(){disposed++;geometry.dispose();material.dispose();}};}
const valid=a=>!!a?.scene?.isObject3D&&typeof a.dispose==='function';
test('closed generations cannot publish prepared resources but preserve deferred release',()=>{
 const registry=createWebGpuResourceRegistry();let disposed=0;
 const lease=registry.adopt({namespace:'terrain',key:'revision-1',dispose(){disposed++;}});
 registry.dispose();assert.throws(()=>lease.commit(),/registry closed/);
 assert.equal(disposed,0);assert.equal(registry.status().owned[0].state,'prepared');
 lease.release();lease.release();assert.equal(disposed,1);assert.deepEqual(registry.status().owned,[]);
});
test('one registry owns deduplicated pending work, leases and bounded idle resources',async()=>{
 const registry=createWebGpuResourceRegistry({maxIdleBytes:1e7});let resolve,loads=0;const bank=registry.createBank({namespace:'animal',validate:valid,load:()=>{loads++;return new Promise(r=>{resolve=r;});}}),first=bank.acquire('hyena'),second=bank.acquire('hyena');await Promise.resolve();assert.equal(loads,1);assert.equal(bank.status().entries[0].pending,2);const value=asset();resolve(value);const a=await first,b=await second;assert.equal(a.asset,b.asset);assert.equal(a.version,b.version);assert.equal(bank.status().entries[0].refs,2);a.release();assert.equal(value.disposed,0);b.release();assert.equal(value.disposed,0);const c=await bank.acquire('hyena');assert.equal(c.version,a.version);c.release();registry.dispose();assert.equal(value.disposed,1);assert.equal(registry.status().banks.length,0);
});
test('closing a generation cancels pending work and retains leased assets until release',async()=>{
 const registry=createWebGpuResourceRegistry({maxIdleBytes:1e7});let finish;const live=asset(),late=asset(),bank=registry.createBank({namespace:'worker',validate:valid,load:key=>key==='live'?live:new Promise(r=>{finish=r;})}),lease=await bank.acquire('live'),pending=bank.acquire('late');await Promise.resolve();registry.dispose();assert.equal(live.disposed,0);assert.equal(registry.status().banks[0].entries.find(e=>e.key==='live').refs,1);finish(late);await assert.rejects(pending,{name:'AbortError'});assert.equal(late.disposed,1);lease.release();assert.equal(live.disposed,1);assert.equal(registry.status().banks.length,0);assert.throws(()=>registry.createBank({}),/closed/);
});
test('resource identity changes after eviction and failures are retryable',async()=>{
 const registry=createWebGpuResourceRegistry({maxIdleBytes:0});let loads=0,first;const bank=registry.createBank({namespace:'world',validate:valid,load:()=>{if(++loads===1)throw Error('missing');const value=asset();first??=value;return value;}});await assert.rejects(bank.acquire('tree'),/missing/);const a=await bank.acquire('tree');a.release();assert.equal(first.disposed,1);const b=await bank.acquire('tree');assert.ok(b.version>a.version);assert.throws(()=>registry.createBank({namespace:'world',load(){},validate(){}}),/already owned/);b.release();registry.dispose();
});

test('world owner lives under a generation lease and retires exactly once with unknown bytes',async()=>{
 const registry=createWebGpuResourceRegistry({maxIdleBytes:1024});let disposed=0,loads=0;const bank=registry.createBank({namespace:'world-biome',load:()=>{loads++;return {replace(){},dispose(){disposed++;}};},validate:value=>typeof value?.replace==='function'&&typeof value?.dispose==='function'}),lease=await bank.acquire('sabana');assert.equal(loads,1);assert.equal(registry.status().banks[0].entries[0].refs,1);registry.dispose();assert.equal(disposed,0);lease.release();lease.release();assert.equal(disposed,1);assert.deepEqual(registry.status().banks,[]);
});
