import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import test from 'node:test';
import {MessageChannel} from 'node:worker_threads';
import {gunzipSync} from 'node:zlib';
import {savedNativeAuthorityOptions} from '../src/simulation/native-authority-checkpoint.js';
import {createSimulationAuthorityClient} from '../src/simulation/simulation-authority-client.js';
import {copyNativeRecoveryGroup} from '../src/world/native-worker-route-recovery.js';
import {nativeProductionAuthority,untilProduction} from './helpers/native-production-authority.js';
import {fixture as drawFixture,flush} from './helpers/remote-webgpu-fixture.js';

test('terminal Draw recovers ordinary Home19 before the first Savanna raid',{timeout:30000},async()=>{
 const save=gunzipSync(readFileSync(new URL('./fixtures/sabana714-d1-native-pending-home.json.gz',import.meta.url))).toString();
 const initial=JSON.parse(save),options=savedNativeAuthorityOptions(save);
 assert.equal(options.nativeWorkerLifecycle,true);
 const manifest={epoch:'ordinary-home-terminal',chunks:options.chunkKeys.map(key=>{
  const [cx,cz]=key.split(',').map(Number);return {cx,cz,revision:1};
 })};
 const f=await nativeProductionAuthority(initial,{...options,getTerrainManifest:()=>manifest});
 const channel=new MessageChannel();
 let replacement,attached=false,arrival,state;
 try{
  f.command({kind:'setNavigationView',view:options.navigationView});
  for(let i=0;i<550;i++){
   const p=await f.command({kind:'advance',seconds:.05,steps:8,nightFastForward:true});
   for(const key of p.residency?.missing??[])f.command({kind:'addChunk',key});
   await f.present();
   arrival=f.records.find(row=>row.kind==='home-arrival'&&row.committed);
   if(arrival&&p.elapsed>=314.75){state=JSON.parse(p.snapshot);break;}
  }
  assert(state&&arrival);
  await arrival.packet.presented;
  const worker=state.workers[0],at=state.elapsed;
  assert.equal(worker.status,'home');
  assert.equal(state.raid,null);
  assert.deepEqual(f.host.inspect().nativeRouteFrame.bindings,[]);
  const hold=await f.authority.quiesceNativeIntentProduction({forLostDraw:true});
  f.retireResourceEndpoint();
  f.gpu.device.destroy();
  await untilProduction(f,()=>f.authority.nativeIntentControlStatus().current?.drained);
  const resources=await f.authority.flushNativeResourcePreparation({forLostDraw:true,allowRetired:true});
  assert.equal(resources.callbacksSettled,true);
  assert.equal(resources.terminal,true);
  const route=await f.authority.terminalWorkerRoute();
  assert.deepEqual(route,{version:2,refuge:true,members:[]});

  replacement=await drawFixture({capabilities:{nativeHomeArrivalVersion:1}},
   {intentControl:{port:channel.port2,session:'production-control',recoveryHold:30}});
  const {recoveredWorkerRoute:descriptor}=await f.authority.attachHeldWorkerRoute(channel.port1,'production-control',30,hold,route);
  const {refuge,worldBoundary}=descriptor,ref=refuge.reference;
  assert.deepEqual(descriptor.members,[]);
  assert.equal(ref.actorId,Number(worker.id.split('-').at(-1)));
  assert.equal(ref.bodyId,1);
  assert.deepEqual(descriptor.terrainManifest,manifest);
  assert.deepEqual(copyNativeRecoveryGroup(descriptor,worldBoundary),{members:[],refuge});
  assert.throws(()=>copyNativeRecoveryGroup(descriptor,{...worldBoundary,ticket:worldBoundary.ticket+1}),/requires the surviving animal/);
  for(const nativeWorkerLifecycle of [true,false]){
   const worker={postMessage(){},terminate(){}};
   const client=createSimulationAuthorityClient({snapshot:save,chunkKeys:options.chunkKeys,session:'home-recovery',
    nativeWorkerLifecycle,workerFactory:()=>worker});
   const receive=data=>worker.onmessage({data:{session:'home-recovery',...data}});
   try{
    receive({kind:'ready'});await client.ready;
    const first=client.submit({kind:'snapshot'});
    receive({kind:'result',sequence:1});await first.result;
    const attachment=client.attachNativeIntentControl({postMessage(){},close(){}},{recoveryHold:30});
    receive({kind:'nativeIntentControlAttached',authorityEpoch:worldBoundary.authorityEpoch,sequence:refuge.retiredSequence,
     recoveredWorkerRoute:{...descriptor,publicationSequence:1}});
    if(nativeWorkerLifecycle)assert.deepEqual((await attachment).recoveredWorkerRoute.refuge,refuge);
    else await assert.rejects(attachment,/Ordinary Home recovery is unavailable/);
   }finally{client.dispose();}
  }
  await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted/);

  const metadata={nativeWorldBoundary:worldBoundary,clock:{...f.clock,elapsed:at,safeUntil:at,paused:true,segments:[]}};
  const writing=replacement.frame(33,metadata);
  writing.catch(()=>{});
  await flush();await replacement.host.idle();
  await assert.rejects(f.authority.checkHeldDraw(30,hold,route),/Missing submitted/);
  replacement.host.present();await writing;
  const submitted=await f.authority.checkHeldDraw(30,hold,route);
  assert.deepEqual(submitted.refuge,refuge);
  assert.equal(submitted.elapsed,at);
  assert.deepEqual(replacement.host.inspect().nativeRouteFrame.bindings,[]);

  await f.attachRecoveredResources(replacement);
  attached=true;
  assert.equal(f.authority.resumeNativeIntentProduction(hold),true);
  const result=await f.command({kind:'advance',seconds:.05,steps:2,nightFastForward:false});
  const next=JSON.parse(result.snapshot);
  assert(result.elapsed>at);
  assert.deepEqual(next.workers,[worker]);
  assert.deepEqual(next.ledger,state.ledger);
  assert.deepEqual(f.faults,[]);
 }finally{
  channel.port1.close();channel.port2.close();
  try{await f.close();}finally{if(replacement&&!attached){replacement.client.dispose();await replacement.host.dispose();}}
 }
});
