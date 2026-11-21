import test from 'node:test';
import assert from 'node:assert/strict';
import {MessageChannel} from 'node:worker_threads';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';
import {tick} from '../src/simulation/game.js';
import {createTerrainPublication} from '../src/simulation/terrain-publication.js';
import {createConfirmedTerrainReceiver} from '../src/rendering/confirmed-terrain-receiver.js';
import {createNativeResourcePreparationConnection} from '../src/simulation/native-resource-preparation-connection.js';
import {attachNativeResourcePreparationEndpoint} from '../src/rendering/native-resource-preparation-receiver.js';

async function until(predicate){
 for(let i=0;i<200;i++){
  if(predicate())return;
  await new Promise(resolve=>setImmediate(resolve));
 }
 throw Error('Task stop port timed out');
}

async function withPorts(run,{nativeReply=value=>value,terrainReply=value=>value}={}){
 const f=createNativeTaskGameFixture();
 const terrain=new MessageChannel(),resources=new MessageChannel();
 const sent=[],adopted=[],errors=[];
 const send=terrain.port1.postMessage.bind(terrain.port1);
 terrain.port1.postMessage=value=>{sent.push(structuredClone(value));send(value);};
 const reply=terrain.port2.postMessage.bind(terrain.port2);
 terrain.port2.postMessage=value=>reply(terrainReply(structuredClone(value)));
 const sendNative=resources.port2.postMessage.bind(resources.port2);
 resources.port2.postMessage=value=>sendNative(nativeReply(structuredClone(value)));
 const producer=createTerrainPublication({port:terrain.port1,session:'task25-terrain',epoch:'task25-world',retainRevisions:true});
 const receiver=createConfirmedTerrainReceiver({
  port:terrain.port2,session:'task25-terrain',confirmedElapsed:f.state.elapsed,retainRevisions:true,autoBootstrap:true,
  validateRevision(){throw Error('Task stop cannot prepare any geometry');},residency:{replace(){},remove(){}},
  onError:error=>errors.push(error),prepareGraphicalBatch:async()=>({valid:()=>true,commit:()=>true,abort(){}}),
  async prepareGraphicalProposal(messages,{proposedWorldBoundary,nativeTaskRouteStopTemplate}){
   assert.deepEqual(messages,[]);
   let active=true;
   return {canonicalPropsUnmasked:true,preparedWorldBoundary:proposedWorldBoundary,preparedTaskRouteStopTemplate:nativeTaskRouteStopTemplate,
    valid:()=>active,commit(value){adopted.push(value);active=false;return true;},abort(){active=false;}};
  },
 });
 const endpoint=attachNativeResourcePreparationEndpoint({
  port:resources.port2,session:'task25-resources',isRunning:()=>true,onError:error=>errors.push(error),
  prepare(kind,r,{signal}){
   assert.equal(kind,'prepareNativeGateResources');
   return producer.prepareNativeWorldResources({proposedWorldBoundary:r.worldBoundary,resources:r,signal});
  },
 });
 const client=createNativeResourcePreparationConnection({port:resources.port1,session:'task25-resources',timeoutMs:1000});
 try{
  producer.commit(0);
  await client.ready;
  await until(()=>receiver.ready(0));
  await until(()=>producer.status().window?.batches===0);
  tick(f.state,.1,f.nav);
  const staged=f.planner.prepareNativeTaskRouteStopProposal(f.state.workers[0].id);
  assert.equal(staged.status,'proposed');
  await run({...f,staged,client,receiver,producer,sent,adopted,errors,endpoint});
 }finally{
  client.dispose();
  endpoint.dispose();
  producer.dispose();
  receiver.dispose();
  f.close();
 }
}

test('Task25 retains exact owners through the existing resource and terrain channels',()=>withPorts(async f=>{
 const {nativeStop:original,...untyped}=f.staged.proposal;
 await assert.rejects(f.client.prepareNativeGateResources(untyped),/stop reference/);
 assert.equal(f.sent.some(value=>value.kind==='terrainProposal'),false);
 const handle=await f.client.prepareNativeGateResources(f.staged.proposal);
 assert.deepEqual(handle.preparedTaskRouteStopTemplate,original);
 const proposal=f.sent.find(value=>value.kind==='terrainProposal');
 assert.deepEqual(proposal.messages,[]);
 assert.deepEqual(proposal.nativeTaskRouteStopTemplate,original);
 assert.equal(proposal.nativeFarmArrivalStopTemplate,undefined);
 tick(f.state,.1,f.nav);
 const fresh=f.planner.revalidateNativeTaskRouteStopProposal(f.staged.ticket);
 assert.equal(fresh.status,'revalidated');
 const ptr=f.w.nav_intent_barrier_proposal_ticket_ptr();
 const inputs=Array.from(new Float64Array(f.w.memory.buffer,ptr,5));
 assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...inputs,f.staged.ticket.ticket),1);
 assert.equal(f.planner.commitNativeCausalClock().status,'committed');
 const {worldBoundary,nativeStop,routeEffects,gateEffects}=fresh.proposal;
 const proof=f.planner.nativeTaskRouteStopBinding(nativeStop,original,{projection:{version:1,routeEffects,gateEffects}});
 assert(proof);
 const resources=f.session.core.captureNativeWorldResources(worldBoundary);
 const value={worldBoundary,resources,nativeTaskRouteStopBinding:proof};
 assert.throws(()=>handle.commit({...value,nativeFarmArrivalStopBinding:{}}),/family|template/);
 assert.equal(handle.valid(),true);
 assert.equal(handle.commit(value),true);
 await f.client.flush();
 await until(()=>f.receiver.status().nativeProposal?.phase==='armed');
 assert.deepEqual(f.adopted,[]);
 f.producer.commit(1);
 await until(()=>f.receiver.ready(1));
 f.receiver.confirm(1,f.state.elapsed);
 assert.deepEqual(f.adopted,[{worldBoundary,nativeTaskRouteStopBinding:proof}]);
 assert.deepEqual(f.errors,[]);
}));

for(const channel of ['resource','terrain'])test(`Task25 rejects a mixed-family ${channel} ready receipt and cancels its reservation`,()=>{
 let injected=false;
 const inject=value=>{
  if(channel==='resource'&&value.kind==='nativeGateResourcesResult'){value.result.preparedFarmArrivalStopTemplate={};injected=true;}
  if(channel==='terrain'&&value.kind==='terrainProposalReady'){value.preparedIdleStrollStopTemplate={};injected=true;}
  return value;
 };
 return withPorts(async f=>{
  const body=f.body(1);
  await assert.rejects(f.client.prepareNativeGateResources(f.staged.proposal),/family|template/);
  assert.equal(injected,true);
  await f.client.flush();
  await until(()=>f.receiver.status().nativeProposal===null);
  assert.deepEqual(f.body(1),body);
  assert.deepEqual(f.adopted,[]);
  assert.deepEqual(f.errors,[]);
  assert.equal(f.planner.cancelNativeTaskRouteStopProposal(f.staged.ticket),true);
 },channel==='resource'?{nativeReply:inject}:{terrainReply:inject});
});
