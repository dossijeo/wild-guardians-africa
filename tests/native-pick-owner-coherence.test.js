import test from 'node:test';
import assert from 'node:assert/strict';
import {withNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {nativeIdleCycleRemoteFixture} from './helpers/native-idle-cycle-remote.js';

const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b;});return {promise,resolve,reject};};
const route=generation=>({actorId:7,assignmentSequence:generation,routeHandle:{authorityEpoch:'owner',session:1,slot:0,generation}});
const world={version:1,authorityEpoch:'owner',nativeSession:1,ticket:3,effectiveTime:10};
const receipt=(generation,time=10.25)=>({consumer:{failed:false,nativeRouteFrame:{sequence:generation,clockElapsed:11,worldBoundary:world,bindings:[{nativeRoute:route(generation),semantic:'relative',epoch:10,elapsed:time}]}}});
function setup(){
 let generation=2,closed=false,presented=null;const requests=[];
 const options={isClosed:()=>closed,inspect(){const request=deferred();requests.push(request);return request.promise;},readOwner(){const before=generation;return {native:true,worldBoundary:world,presented,current:()=>before===generation};}};
 return {requests,run:operation=>withNativeRoutePickFrame(options,operation),adopt(value,submission=null){generation=value;presented=submission;},close(){closed=true;},route:()=>route(generation)};
}
const flush=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};

test('adoption during inspection cannot combine a new owner with an old submitted clock, even in the same world',async()=>{
 const f=setup(),submitted=deferred();let calls=0;
 const result=f.run(frame=>{calls++;return frame.getTime(f.route(),10);});
 f.adopt(3,submitted.promise);f.requests[0].resolve(receipt(2));await flush();
 assert.equal(calls,0);assert.equal(f.requests.length,1,'wait on the existing acquisition, not polling');
 submitted.resolve();await flush();assert.equal(f.requests.length,2);
 f.requests[1].resolve(receipt(3,10.5));assert.equal(await result,10.5);assert.equal(calls,1);
});

test('two concurrent inputs use their own submitted snapshots in the capture continuation',async()=>{
 const f=setup(),seen=[];
 const a=f.run(frame=>seen.push(['a',frame.sequence,frame.getTime(f.route(),10)]));
 const b=f.run(frame=>seen.push(['b',frame.sequence,frame.getTime(f.route(),10)]));
 f.requests[1].resolve(receipt(2,10.75));f.requests[0].resolve(receipt(2,10.25));await Promise.all([a,b]);
 assert.deepEqual(seen,[['b',2,10.75],['a',2,10.25]]);
});

test('retirement during inspection never invokes picking on disposed owners',async()=>{
 const f=setup();let called=false;const result=f.run(()=>{called=true;});
 f.close();f.requests[0].resolve(receipt(2));await assert.rejects(result,/unavailable/);assert.equal(called,false);
});

test('cancelled or rejected acquisition terminates the pick without retrying or resurrecting its source',async()=>{
 const f=setup(),submitted=deferred();f.adopt(3,submitted.promise);
 const result=f.run(()=>assert.fail('unsubmitted owner'));submitted.reject(Error('Prepared frame cancelled'));
 await assert.rejects(result,/Prepared frame cancelled/);assert.equal(f.requests.length,0);
});

test('retirement during acquisition is terminal, even when submission subsequently completes',async()=>{
 const f=setup(),submitted=deferred();f.adopt(3,submitted.promise);
 const result=f.run(()=>assert.fail('retired owner'));f.close();submitted.resolve();
 await assert.rejects(result,/unavailable/);assert.equal(f.requests.length,0);
});

test('a stable owner with the wrong submitted identity is rejected without a borrowed clock or retry',async()=>{
 const f=setup();const result=f.run(frame=>frame.getTime(f.route(),10));
 f.requests[0].resolve(receipt(3));await assert.rejects(result,/no submitted/);assert.equal(f.requests.length,1);
});

test('a submitted world mismatch and asynchronous pick callback are rejected',async()=>{
 for(const wrongWorld of [true,false]){
  const f=setup(),result=f.run(()=>Promise.resolve('not synchronous')),value=receipt(2);
  if(wrongWorld)value.consumer.nativeRouteFrame.worldBoundary={...world,ticket:4};
  f.requests[0].resolve(value);await assert.rejects(result,wrongWorld?/submitted world/:/must be synchronous/);
 }
});

test('real client retirement rejects a committed but unpresented acquisition and its waiting input',async()=>{
 const f=await nativeIdleCycleRemoteFixture();
 try{
  const result=await f.run();assert.equal(result.status,'committed');
  const packet=f.v.packets.at(-1);let inspected=false;
  const pick=withNativeRoutePickFrame({isClosed:()=>false,inspect:()=>{inspected=true;throw Error('retired');},
   readOwner:()=>({native:true,presented:packet.presented,current:()=>true})},()=>assert.fail('unpresented owner'));
  const rejected=assert.rejects(pick,/disposed/);
  // The original client rejects pendingFrame; this does not resolve a test
  // promise or invent a submission, timeout, retirement signal or GPU fence.
  f.v.client.dispose();await rejected;assert.equal(inspected,false);
 }finally{await f.close();}
});
