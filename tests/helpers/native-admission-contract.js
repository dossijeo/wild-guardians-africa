import test from 'node:test';
import assert from 'node:assert/strict';

const deferred=()=>{let resolve;return {promise:new Promise(r=>{resolve=r;}),resolve};};

// Extend an operation by providing native facts, not by copying concurrency
// tests. create(hooks) returns {vertical,run,advance,binding,held,peer,cancel,close}.
export function registerNativeAdmissionContract(name,create){
  test(`${name}: one preparation survives advancing simulation and drains before native commit`,{timeout:15000},async()=>{
    const entered=deferred(),ready=deferred();let f,initialTime,resourcesAtReady;
    f=await create({onPrepare:async()=>{entered.resolve();await ready.promise;},
      onReady:({client})=>{resourcesAtReady=client.inspect().resourcesCreated;},onDrain:()=>f.advance(.02)});
    try{
      const held=f.held(),peer=f.peer(),pending=f.run();await entered.promise;
      initialTime=f.time();f.advance(.2);assert.equal(f.binding(),null);assert.deepEqual(f.held(),held);assert.notDeepEqual(f.peer(),peer);
      ready.resolve();const result=await pending;assert.equal(result.status,'committed',JSON.stringify(result));
      assert(f.binding().reference.worldBoundary.effectiveTime>=initialTime+.2);assert.deepEqual(f.held(),held);
      await f.vertical.present();assert.equal(f.vertical.host.inspect().activeSequence,f.vertical.packets.at(-1).sequence);
      assert.equal(f.vertical.client.inspect().resourcesCreated,resourcesAtReady);
      assert.equal(f.vertical.counters().preparations,1);assert.equal(f.vertical.counters().commits,1);
      assert.deepEqual(f.vertical.errors,[]);assert.equal(f.vertical.host.inspect().failed,false);
    }finally{ready.resolve();await f.close();}
  });

  test(`${name}: cancellation during preparation cannot issue an assignment`,{timeout:15000},async()=>{
    const entered=deferred(),ready=deferred(),controller=new AbortController();
    const f=await create({onPrepare:async()=>{entered.resolve();await ready.promise;}});
    try{const held=f.held(),pending=f.run(controller.signal);await entered.promise;controller.abort();
      const result=await pending;assert.equal(result.status,'control-failed');assert.equal(f.binding(),null);assert.deepEqual(f.held(),held);
      ready.resolve();assert.equal(f.vertical.counters().commits,0);
    }finally{ready.resolve();await f.close();}
  });

  test(`${name}: changed native intention during drain rejects prepared resources`,{timeout:15000},async()=>{
    let f;f=await create({onDrain:()=>f.cancel()});
    try{const result=await f.run();assert.equal(result.status,'resources-changed',JSON.stringify(result));
      assert.equal(f.binding(),null);assert.equal(f.vertical.counters().commits,0);assert.equal(f.vertical.source.status().closed,false);
    }finally{await f.close();}
  });

  test(`${name}: preparation failure leaves the native source uncommitted`,{timeout:15000},async()=>{
    const f=await create({onPrepare:()=>{throw Error('vertical preparation failure');}});
    try{const held=f.held(),result=await f.run();assert.equal(result.status,'control-failed');assert.match(result.error,/vertical preparation failure/);
      assert.equal(f.binding(),null);assert.deepEqual(f.held(),held);assert.equal(f.vertical.counters().commits,0);
    }finally{await f.close();}
  });

  test(`${name}: release failure after physical commit never reports a rollback`,{timeout:15000},async()=>{
    const f=await create({onDrain:({source})=>{source.releaseGpuAfterMutation=()=>{throw Error('vertical release failure');};}});
    try{const result=await f.run();assert.equal(result.status,'committed-control-failed');assert.match(result.error,/vertical release failure/);
      assert(f.binding());assert.equal(f.vertical.source.status().closed,true);
    }finally{await f.close();}
  });
}
