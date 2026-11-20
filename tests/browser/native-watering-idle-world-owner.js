import {createSimulationAuthorityClient} from '../../src/simulation/simulation-authority-client.js';
import {createWebGpuWorldClient} from '../../src/rendering/webgpu-world-client.js';
import {serializeConfirmedState} from '../../src/simulation/confirmed-live-state.js';
import {openVisualStream} from '../../src/simulation/visual-publication-stream.js';

// Start from a semantic action save. The new authority acquires Action15 and
// Idle20 and admits the next Harvest scheduled by Game through the usual ports.
export async function auditNativeWateringIdleWorldOwner({saved,chunkKeys,center,ground,kind,targetId,nextTargetId}){
 const session=`watering-${crypto.randomUUID()}`,errors=[],sourceErrors=[],messages=[],diagnostic=new MessageChannel();
 const workerId=saved.workers[0].id,actorId=Number(workerId.split('-').at(-1)),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const source=createSimulationAuthorityClient({snapshot:serializeConfirmedState(saved),chunkKeys,session,allowTerrainBootstrap:true,workerFactory:()=>{
  const worker=new Worker(new URL('../../src/simulation/simulation-authority-worker.js',import.meta.url),{type:'module'});
  worker.addEventListener('message',({data})=>{if(['error','nativeIntentControlFailure'].includes(data.kind))sourceErrors.push(data);});return worker;
 }});
 diagnostic.port1.onmessage=({data})=>messages.push(data);
 let client,visual,preparer,running=true,loop,confirmed,stage='initializing';
 const current=()=>confirmed.workers.find(worker=>worker.id===workerId);
 const waterStatus=()=>confirmed.plants.find(plant=>plant.id===targetId).water[kind==='initial'?0:1].status;
 const events=()=>confirmed.events.filter(event=>event.type==='WaterSatisfied'&&event.targetId===targetId);
 const acquired=key=>messages.find(message=>message.kind==='production-acquired'&&message.key===key)?.binding;
 const wait=async(predicate,label,ms=40000)=>{
  const deadline=performance.now()+ms;
  while(!predicate()){
   if(errors.length||sourceErrors.length)throw Error(JSON.stringify({errors,sourceErrors}));
   if(performance.now()>=deadline)throw Error(`Timed out waiting for ${label}`);
   await delay(20);
  }
 };
 const submit=async command=>{
  const submitted=source.submit(command);
  if(!submitted.accepted)throw Error(`Authority command rejected ${submitted.reason}`);
  return submitted.result;
 };
 const publish=result=>{confirmed=JSON.parse(result.snapshot);visual.publish({session,...result},true);};
 const inspect=()=>client.inspect();
 const trace=i=>i.drawExecution.consumer;
 try{
  await source.ready;const initial=await submit({kind:'snapshot'});
  const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;document.body.append(canvas);
  const control=new MessageChannel(),resources=new MessageChannel();
  const camera={x:center.x,y:ground+13,z:center.z+22,targetX:center.x,targetY:ground+1,targetZ:center.z};
  client=createWebGpuWorldClient({canvas,session,snapshot:initial.snapshot,width:640,height:360,camera,remoteDraw:true,intentControlPort:control.port2,
   experimentalAllActors:true,experimentalMinimalWorld:true,presentationCapabilities:{bakedWorkerWalking:true,picking:true},quality:'muy_baja',
   onError:error=>errors.push(String(error.stack??error)),onResourceError:error=>errors.push(JSON.stringify(error)),workerFactory:()=>{
    preparer=new Worker(new URL('./fixtures/native-production-world-audit-worker.js',import.meta.url),{type:'module'});
    preparer.postMessage({kind:'configure-production-audit',holdWatering:true,port:diagnostic.port2},[diagnostic.port2]);return preparer;
   }});
  visual=openVisualStream(client.presentationPort,session,()=>{},{incrementalTransport:true});
  await Promise.all([source.reattachTerrain(client.terrainPort,{bootstrap:true}),source.attachNativeIntentControl(control.port1),client.ready]);
  publish(initial);await client.waitForFirstFrame();let original=await inspect();
  const assetsDeadline=performance.now()+60000;
  while(!original.workers?.ready||!original.crops?.ready||!original.workers.assets?.profiles.every(profile=>profile.textured)){
   if(errors.length||sourceErrors.length||performance.now()>=assetsDeadline)throw Error('Watering audit assets unavailable');
   await delay(25);original=await inspect();
  }
  client.attachNativeResourcePreparation(resources.port2);await source.attachNativeResourcePreparation(resources.port1);
  loop=(async()=>{
   while(running){
    if(visual.blocked()){await delay(4);continue;}
    const began=performance.now();publish(await submit({kind:'advance',seconds:.02,steps:1,nightFastForward:false}));
    await delay(Math.max(0,20-(performance.now()-began)));
   }
  })().catch(error=>errors.push(String(error.stack??error)));
  stage='waiting for watering Idle READY';
  const readiness=()=>messages.find(message=>message.kind==='production-resources-ready');
  await wait(readiness,stage);const ready=readiness().reference,action=acquired('nativeTaskActionBinding');
  if(!action||action.reference.request.actionKind!==kind||action.reference.request.bodyId!==ready.bodyId||ready.wateringSource.actionSequence!==action.actionSequence)throw Error('Watering Idle differs from its acquired Action');
  const before=await inspect(),heldAt=confirmed.elapsed;await delay(700);const held=await inspect();
  if(waterStatus()!=='due'||events().length||current().nativeTaskAction?.elapsed!==action.reference.request.duration||acquired('nativeInitialIdleBodyBinding')||
     confirmed.elapsed<=heldAt||trace(held).samples.length<=trace(before).samples.length)throw Error('Watering changed the source or paused drawing while its packet was retained');
  preparer.postMessage({kind:'release-production-ready',durationMs:650});
  stage='waiting for watering effect and Idle acquisition';
  await wait(()=>acquired('nativeInitialIdleBodyBinding')&&waterStatus()==='manual'&&events().length===1,stage);
  const idle=acquired('nativeInitialIdleBodyBinding'),atEffect=structuredClone(current()),after=await inspect();
  if(idle.reference.bodyId!==ready.bodyId||idle.reference.wateringSource.actionSequence!==action.actionSequence||atEffect.taskId===`task-${action.reference.request.taskId}`||confirmed.crates.length||
     idle.reference.sourceRequest.pose.x!==ready.sourceRequest.pose.x||idle.reference.sourceRequest.pose.z!==ready.sourceRequest.pose.z)throw Error('Watering Idle did not retain the original worker and body');
  stage='waiting for second Task admission';
  await wait(()=>acquired('nativeTaskStartBinding'),stage);
  const task=acquired('nativeTaskStartBinding'),last=await inspect(),draws=trace(last).samples;
  if(task.reference.actorId!==actorId||task.reference.bodyId!==idle.reference.bodyId||task.reference.targetId!==Number(nextTargetId.split('-').at(-1))||events().length!==1||!draws.some(draw=>draw.nativeWorldBoundary?.ticket===idle.reference.worldBoundary.ticket))throw Error('Subsequent ordinary Task or acquired Idle draw is missing');
  if(last.inspectionGeneration!==original.inspectionGeneration||trace(last).gpuErrors||trace(last).failed||!trace(last).adapterInfo?.vendor||/swiftshader|software/i.test(JSON.stringify(trace(last).adapterInfo)))throw Error('Original hardware consumer is unavailable');
  const sourceAfter={worker:current(),waterStatus:waterStatus(),events:events(),crates:confirmed.crates};
  running=false;await loop;client.dispose();await wait(()=>messages.some(message=>message.kind==='production-gpu-drained'),'GPU drain');
  return {kind,adapter:trace(last).adapterInfo,action,ready,idle,task,atEffect,sourceAfter,draws:{before:trace(before).samples.length,held:trace(held).samples.length,idle:draws.filter(draw=>draw.nativeWorldBoundary?.ticket===idle.reference.worldBoundary.ticket).length},owners:{original:original.qaResidentOwners,after:after.qaResidentOwners},drain:messages.find(message=>message.kind==='production-gpu-drained'),errors,sourceErrors};
 }catch(error){window.nativeWateringIdleFailure={stage,error:String(error.stack??error),errors,sourceErrors,messages,confirmed,inspection:client?await inspect().catch(e=>String(e)):null};throw error;}
 finally{running=false;await loop;visual?.close();client?.dispose();source.dispose();diagnostic.port1.close();}
}
