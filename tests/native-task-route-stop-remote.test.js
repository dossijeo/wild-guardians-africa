import test from 'node:test';
import assert from 'node:assert/strict';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';
import {fixture as remoteFixture,pair,flush} from './helpers/remote-webgpu-fixture.js';
import {createNativeIntentControlPublication} from '../src/simulation/native-intent-control-publication.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {NATIVE_STOP_POSE_FIELDS} from '../src/world/native-worker-route-stop-codec.js';
import {tick} from '../src/simulation/game.js';

async function runRemote({relative=true,stripTemplate=false}={}){
 const f=createNativeTaskGameFixture(),[sourcePort,drawPort]=pair(),session='task25-remote';
 let g,source,frame,selector,epoch,bodyAtPrepare,created;
 const errors=[];
 try{
  g=await remoteFixture({
   capabilities:{width:20,height:10,format:'rgba8unorm',nativeTaskRouteStopVersion:1,nativeTaskRouteStopClockVersion:1},
  },{intentControl:{port:drawPort,session},absoluteNow:()=>Number.MAX_SAFE_INTEGER});
  source=createNativeIntentControlPublication({port:sourcePort,session,observe:f.planner.observeNativeIntentControl,timeoutMs:1000,onError:error=>errors.push(error.message)});
  await source.ready;
  if(stripTemplate){
   const send=sourcePort.postMessage.bind(sourcePort);
   sourcePort.postMessage=message=>{
    if(message.type==='IntentMutationQuiesce'){
     const {preparedTaskRouteStopTemplate,...untyped}=message;
     return send(untyped);
    }
    return send(message);
   };
  }
  tick(f.state,.1,f.nav);
  const actorId=f.state.workers[0].id,execution=f.planner.nativeTaskExecution(actorId);
  epoch=f.planner.nativeTaskStartBinding(actorId).reference.worldBoundary.effectiveTime;
  const result=await f.planner.stopNativeTaskRouteAfterGpuQuiescence({
   actorId,getPublication:()=>source,
   async prepareResources({resources,signal}){
    const worldBoundary=resources.worldBoundary,stop=resources.nativeStop;
    selector={kind:'native-task-route-stopped-body',version:1,stop,actorId:execution.nativeRoute.actorId};
    g.client.beginFrame({nativeWorldBoundary:worldBoundary});
    const buffer=g.client.device.createBuffer({label:'task-stopped-values',size:48,usage:72});
    g.client.device.queue.writeBuffer(buffer,0,new Float32Array(12));
    if(relative)g.client.registerClockBinding(buffer,{byteOffset:0,semantic:'relative',epoch,nativeStopped:selector});
    for(const [index,stopField] of ['age',...Object.keys(NATIVE_STOP_POSE_FIELDS)].entries())
     g.client.registerClockBinding(buffer,{byteOffset:(index+1)*4,semantic:'stop-value',epoch,nativeStopped:selector,stopField});
    const group=g.client.device.createBindGroup({entries:[{binding:0,resource:{buffer}}]});
    const encoder=g.client.device.createCommandEncoder();
    const pass=encoder.beginRenderPass({colorAttachments:[{view:g.client.context.getCurrentTexture().createView(),loadOp:'clear',storeOp:'store'}]});
    pass.setPipeline(g.pipeline);pass.setBindGroup(0,group);pass.draw(3);pass.end();
    g.client.device.queue.submit([encoder.finish()]);
    const clock={version:1,epoch:0,elapsed:worldBoundary.effectiveTime,safeUntil:Number.MAX_SAFE_INTEGER,anchorAbsoluteMs:0,paused:true,segments:[]};
    frame=await g.client.prepareNativeWorldFrame({nativeWorldBoundary:worldBoundary,nativeTaskRouteStopTemplate:stop,clock},{signal});
    created=g.host.inspect().resourcesCreated;
    tick(f.state,.13,f.nav);bodyAtPrepare=f.body(1);
    return {preparedWorldBoundary:frame.preparedWorldBoundary,preparedTaskRouteStopTemplate:stop,valid:frame.valid,commit:data=>frame.commit(data.worldBoundary,data.nativeTaskRouteStopBinding),abort:frame.abort};
   },
  });
  if(!relative||stripTemplate){
   assert.equal(result.status,'control-failed',JSON.stringify(result));
   assert(f.planner.nativeTaskExecution(actorId));
   assert(g.errors.some(error=>(stripTemplate?/omitted its retained template/:/relative clock/).test(error.message)));
   assert.equal(f.w.nav_intent_barrier_proposal_ticket(),0);
   assert.deepEqual(f.body(1),bodyAtPrepare);
   return;
  }
  assert.equal(result.status,'committed',JSON.stringify({result,errors,host:g.errors.map(error=>error.message)}));
  await flush();
  await g.host.idle();
  g.host.present();
  await frame.presented;
  const snapshot=g.host.inspect(),projection=captureNativeRoutePickFrame(snapshot).getStoppedBody(selector,epoch);
  assert.equal(snapshot.failed,false);
  assert.equal(snapshot.resourcesCreated,created);
  for(const [field,i] of Object.entries(NATIVE_STOP_POSE_FIELDS))
   assert.equal(projection[field],Math.fround(result.nativeTaskRouteStopBinding.projection.routeEffects.rows[8+i]),field);
  assert.deepEqual(f.body(1),bodyAtPrepare);
  assert.deepEqual(g.errors,[]);
  assert.deepEqual(errors,[]);
 }finally{
  frame?.abort();
  source?.dispose();
  g?.client.dispose();
  await g?.host.dispose();
  f.close();
 }
}

test('Task25 retains and presents the exact final selected pose through original client and Host',()=>runRemote());
test('Task25 Host rejects a prepared stop without its relative clock',()=>runRemote({relative:false}));
test('Task25 Host rejects a generic hold that omits the retained stop template',()=>runRemote({stripTemplate:true}));
