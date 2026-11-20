import {createSimulationAuthorityClient} from '../../src/simulation/simulation-authority-client.js';
import {createWebGpuWorldClient} from '../../src/rendering/webgpu-world-client.js';
import {serializeConfirmedState} from '../../src/simulation/confirmed-live-state.js';
import {openVisualStream} from '../../src/simulation/visual-publication-stream.js';

// Exercise a resumed action or a fresh agricultural task through the same authority and Surface.
export async function auditNativeWateringIdleWorldOwner({saved,chunkKeys,center,ground,kind,origin,targetId,nextTargetId,placement}){
 const session=`watering-${crypto.randomUUID()}`,errors=[],sourceErrors=[],messages=[],diagnostic=new MessageChannel();
 const workerId=saved.workers[0].id,actorId=Number(workerId.split('-').at(-1)),delay=ms=>new Promise(resolve=>setTimeout(resolve,ms));
 const source=createSimulationAuthorityClient({snapshot:serializeConfirmedState(saved),chunkKeys,session,allowTerrainBootstrap:true,workerFactory:()=>{
  const worker=new Worker(new URL('../../src/simulation/simulation-authority-worker.js',import.meta.url),{type:'module'});
  worker.addEventListener('message',({data})=>{if(['error','nativeIntentControlFailure'].includes(data.kind))sourceErrors.push(data);});return worker;
 }});
 diagnostic.port1.onmessage=({data})=>messages.push(data);
 let client,visual,preparer,running=true,loop,confirmed,stage='initializing';
 const repair=kind==='repair';
 const current=()=>confirmed.workers.find(worker=>worker.id===workerId);
 const target=()=>repair?confirmed.structures.find(item=>item.id===targetId):confirmed.plants.find(plant=>plant.id===targetId);
 const waterStatus=()=>repair?null:target().water[kind==='initial'?0:1].status;
 const completed=()=>repair?target().hp===target().maxHp:waterStatus()==='manual';
 const events=()=>confirmed.events.filter(event=>event.type===(repair?'RepairApplied':'WaterSatisfied')&&event.targetId===targetId);
 const acquired=(key,match=()=>true)=>messages.find(message=>message.kind==='production-acquired'&&message.key===key&&match(message.binding.reference))?.binding;
 const actionSource=reference=>reference.wateringSource??reference.centerRepairSource;
 const acquiredIdle=()=>acquired('nativeInitialIdleBodyBinding',r=>actionSource(r));
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
  const assetsDeadline=performance.now()+60000,hasCrops=saved.plants.some(plant=>plant.alive);
  while(!original.workers?.ready||hasCrops&&!original.crops?.ready||!original.workers.assets?.profiles.every(profile=>profile.textured)){
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
  if(origin==='fresh'&&kind==='initial'){
   stage='placing a crop through the authority';
   await wait(()=>acquired('nativeFarmArrivalBinding')&&current().nativeRouteAdmission==='native-idle',stage);
   const id=`plant-${session}`,result=await submit({kind:'plant',id,species:'mijo',...placement});
   if(result.value!==true)throw Error(`Fresh Plant command rejected ${result.rejection}`);
   const placementEvent=JSON.parse(result.snapshot).events.find(event=>event.type==='CropPlaced'&&event.commandId===id);
   if(!placementEvent)throw Error('Fresh Plant command has no CropPlaced event');
   targetId=placementEvent.targetId;publish(result);
  }
  if(repair){
   stage='requesting repair through the authority';
   await wait(()=>acquired('nativeFarmArrivalBinding')&&current().nativeRouteAdmission==='native-idle',stage);
   const id=`repair-${session}`,result=await submit({kind:'requestRepair',id,targetId});
   if(result.value!==true)throw Error(`Fresh Repair command rejected ${result.rejection}`);
   if(!JSON.parse(result.snapshot).events.some(event=>event.type==='RepairRequested'&&event.targetId===targetId))throw Error('Fresh Repair command has no RepairRequested event');
   publish(result);
  }
  stage='waiting for stationary task Idle READY';
  const readiness=()=>messages.find(message=>message.kind==='production-resources-ready');
  await wait(readiness,stage,origin==='fresh'?60000:40000);const ready=readiness().reference,action=acquired('nativeTaskActionBinding');
  if(!action||action.reference.request.actionKind!==kind||action.reference.request.bodyId!==ready.bodyId||actionSource(ready).actionSequence!==action.actionSequence)throw Error('Idle differs from its acquired Action');
  const beforeRepairHp=repair?target().hp:null,paymentId=`repair:task-${action.reference.request.taskId}`;
  const before=await inspect(),heldAt=confirmed.elapsed;await delay(700);const held=await inspect();
  if((repair?target().hp!==beforeRepairHp||Object.hasOwn(confirmed.ledger.entries,paymentId):waterStatus()!=='due')||events().length||current().nativeTaskAction?.elapsed!==action.reference.request.duration||acquiredIdle()||
     confirmed.elapsed<=heldAt||trace(held).samples.length<=trace(before).samples.length)throw Error('The task changed its target or paused drawing while its packet was retained');
  preparer.postMessage({kind:'release-production-ready',durationMs:650});
  stage='waiting for task effect and Idle acquisition';
  await wait(()=>acquiredIdle()&&completed()&&events().length===1,stage);
  const idle=acquiredIdle(),atEffect=structuredClone(current()),after=await inspect();
  if(idle.reference.bodyId!==ready.bodyId||actionSource(idle.reference).actionSequence!==action.actionSequence||atEffect.taskId===`task-${action.reference.request.taskId}`||confirmed.crates.length||
     idle.reference.sourceRequest.pose.x!==ready.sourceRequest.pose.x||idle.reference.sourceRequest.pose.z!==ready.sourceRequest.pose.z)throw Error('Watering Idle did not retain the original worker and body');
  stage=origin==='fresh'?'verifying initial Task and Idle draw':'waiting for second Task admission';
  if(origin!=='fresh')await wait(()=>acquired('nativeTaskStartBinding'),stage);
  const task=acquired('nativeTaskStartBinding'),idleTicket=idle.reference.worldBoundary.ticket;
  let last=await inspect();const frameDeadline=performance.now()+15000;
  while(!trace(last).samples.some(draw=>draw.nativeWorldBoundary?.ticket===idleTicket)){
   if(errors.length||sourceErrors.length||performance.now()>=frameDeadline)throw Error('The acquired watering Idle packet was never drawn');
   await delay(20);last=await inspect();
  }
  const draws=trace(last).samples;
  const expectedTaskTarget=origin==='fresh'?targetId:nextTargetId;
  const taskSequenceMatches=origin==='fresh'?task?.assignmentSequence===action.reference.request.nativeRoute?.assignmentSequence:true;
  if(task?.reference.actorId!==actorId||task.reference.bodyId!==idle.reference.bodyId||task.reference.targetId!==Number(expectedTaskTarget.split('-').at(-1))||
     !taskSequenceMatches||events().length!==1)throw Error('Ordinary Task or acquired Idle draw is missing');
  if(last.inspectionGeneration!==original.inspectionGeneration||trace(last).gpuErrors||trace(last).failed||!trace(last).adapterInfo?.vendor||/swiftshader|software/i.test(JSON.stringify(trace(last).adapterInfo)))throw Error('Original hardware consumer is unavailable');
  const [priorActor]=original.qaResidentOwners.actors,[currentActor]=after.qaResidentOwners.actors;
  if(priorActor.root!==currentActor.root||JSON.stringify(priorActor.bones)!==JSON.stringify(currentActor.bones)||
     priorActor.meshes.some(mesh=>!currentActor.meshes.some(current=>current.id===mesh.id&&current.geometry===mesh.geometry)))throw Error('Watering replaced original actor resources');
  const sourceAfter={worker:current(),waterStatus:waterStatus(),events:events(),crates:confirmed.crates};
  if(repair){
   const event=sourceAfter.events[0].repair,payment=confirmed.ledger.entries[paymentId];
   if(event.previousHp!==beforeRepairHp||event.restoredHp!==target().maxHp||event.paymentId!==paymentId||!payment||event.paidCoins<=0)throw Error('Repair did not publish the original debit and HP change');
   sourceAfter.payment=payment;
  }
  stage='quiescing native production before GPU drain';
  running=false;await loop;
  const quiesced=await source.quiesceNativeIntentProduction(1);
  if(quiesced.holdId!==1)throw Error('Native production did not quiesce for GPU drain');
  client.dispose();await wait(()=>messages.some(message=>message.kind==='production-gpu-drained'),'GPU drain');
  return {kind,origin,targetId,adapter:trace(last).adapterInfo,action,ready,idle,task,atEffect,sourceAfter,draws:{before:trace(before).samples.length,held:trace(held).samples.length,idle:draws.filter(draw=>draw.nativeWorldBoundary?.ticket===idle.reference.worldBoundary.ticket).length},owners:{original:original.qaResidentOwners,after:after.qaResidentOwners},drain:messages.find(message=>message.kind==='production-gpu-drained'),errors,sourceErrors};
 }catch(error){window.nativeWateringIdleFailure={stage,error:String(error.stack??error),errors,sourceErrors,messages,confirmed,inspection:client?await inspect().catch(e=>String(e)):null};throw error;}
 finally{running=false;await loop;visual?.close();client?.dispose();source.dispose();diagnostic.port1.close();}
}
