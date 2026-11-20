import {nativeHomeRouteSource,sameNativeHomeRouteReference} from '../../src/world/native-home-route.js';
import {PROFILES} from '../../src/simulation/workforce.js';

// Continue the same ordinary authority and renderer. These observations delay
// genuine replies; they never issue a physical commit, body or presentation.
export async function auditPostSettlementHome(c,settlement,journey){
 const {client,preparer,wait,delay,getConfirmed,lifecycleMessages,blocks,publications,bornId,pick,stopSource}=c;
 if(!settlement)throw Error('Home continuation has no actual settlement');
 const actor=Number(bornId.split('-').at(-1)),profile=PROFILES.find(p=>p.id===c.born.profile),world=settlement.commit.binding.reference.worldBoundary,progress={stage:'waiting-for-contract-home'};
 window.nativePostSettlementHomeProgress=progress;
 const state=()=>structuredClone(getConfirmed()),worker=s=>s.workers.find(w=>w.id===bornId),pose=['x','z','runPhase','walkPhase','carryPhase','runRemaining'];
 const economic=s=>JSON.stringify(s.ledger)===JSON.stringify(settlement.sourceAfter.ledger)&&s.crates.find(v=>v.id===settlement.economic.entryId.slice(8))?.delivered===true&&s.crates.find(v=>v.id===settlement.economic.entryId.slice(8))?.carrierId===null;
 const snapshot=i=>Object.fromEntries(['inspectionGeneration','nativeWorldBoundary','nativeFrameReadiness','workers','drawExecution','qaBirthRigs','qaResidentOwners'].map(k=>[k,i[k]]));
 const committed=family=>lifecycleMessages.find(v=>v.kind==='birth-resource-committed'&&v.family===family&&v.binding.reference.actorId===actor);
 const metrics=(consumer,stage)=>{const b=blocks.find(v=>v.kind==='birth-block-end'&&v.stage===stage);if(!b)throw Error('Missing Home observation block '+stage);const frames=consumer.samples.filter(v=>v.at>=b.start&&v.at<b.end),p=publications.filter(v=>v.at>=b.start&&v.at<b.end),gaps=frames.slice(1).map((v,i)=>v.at-frames[i].at);if(frames.length<4||p.length<4||frames.at(-1).clockElapsed-frames[0].clockElapsed<.5)throw Error('Home preparation stopped source or hardware clock');return {...b,drawFrames:frames.length,confirmedPublications:p.length,clockAdvance:frames.at(-1).clockElapsed-frames[0].clockElapsed,maxGapMs:Math.max(...gaps)};};
 await wait(()=>lifecycleMessages.some(v=>v.kind==='birth-home-ready'&&v.reference.actorId===actor),'ordinary contract expiry and actual Home READY',130000);
 const ready=lifecycleMessages.find(v=>v.kind==='birth-home-ready'&&v.reference.actorId===actor),r=ready.reference,q=nativeHomeRouteSource(r),beforeSource=state(),w=worker(beforeSource);
 if(r.bodyId!==settlement.commit.binding.reference.bodyId||r.worldBoundary.authorityEpoch!==world.authorityEpoch||r.worldBoundary.nativeSession!==world.nativeSession||r.worldBoundary.ticket<=world.ticket||beforeSource.time<profile.end||w.status!=='returning'||w.nativeRouteAdmission!=='pending-home-resources'||w.taskId||w.crateId||w.path!==null||!economic(beforeSource)||pose.some(k=>w[k]!==q.pose[k])||w.heading!==q.pose.yaw)throw Error('Contract Home does not continue the original delivered body and held pose');
 const before=await client.inspect();Object.assign(progress,{stage:'home-ready',ready,beforeSource,before:snapshot(before)});
 preparer.postMessage({kind:'block-post-settlement-home',stage:'post-settlement-home-ready',durationMs:1800});
 await wait(()=>blocks.some(v=>v.kind==='birth-block-end'&&v.stage==='post-settlement-home-ready'),'genuine Home READY preparer stall');
 const held=await client.inspect(),heldSource=state(),heldWorker=worker(heldSource);
 if(committed('home-route')||heldWorker.nativeRouteAdmission!=='pending-home-resources'||heldWorker.status!=='returning'||pose.some(k=>heldWorker[k]!==q.pose[k])||heldWorker.heading!==q.pose.yaw||!economic(heldSource))throw Error('Home changed before its original READY was released');
 Object.assign(progress,{stage:'held-home-ready',heldSource,held:snapshot(held)});
 preparer.postMessage({kind:'release-birth-home-ready',durationMs:1800});
 await wait(()=>committed('home-route'),'ordinary Home18 acquisition');await wait(()=>blocks.some(v=>v.kind==='birth-block-end'&&v.stage==='home-commit'),'Home18 commit preparer stall');
 const acquired=await client.inspect(),homeCommit=committed('home-route'),consumer=acquired.drawExecution.consumer,actual=consumer.nativeRouteFrame?.bindings.find(v=>v.nativeHome?.actorId===actor),draws=consumer.samples.filter(v=>v.nativeWorldBoundary?.ticket===homeCommit.binding.reference.worldBoundary.ticket);
 Object.assign(progress,{stage:'checking-home-acquisition',homeCommit,actual,acquired:snapshot(acquired)});
 if(!actual||!draws.length||!sameNativeHomeRouteReference(actual.nativeHome,homeCommit.binding.preparedReference)||actual.executionEpoch!==homeCommit.binding.reference.worldBoundary.effectiveTime||homeCommit.binding.reference.bodyId!==r.bodyId)throw Error('Home18 has no original hardware body/frame/execution origin');
 const readyBlock=metrics(consumer,'post-settlement-home-ready'),commitBlock=metrics(consumer,'home-commit');
 Object.assign(progress,{stage:'home-acquired',homeCommit,actual,acquired:snapshot(acquired),readyBlock,commitBlock});
 await wait(()=>lifecycleMessages.some(v=>v.kind==='birth-home-arrival-ready'&&v.reference.actorId===actor),'ordinary Home endpoint and genuine absence READY',60000);
 const arrivalReady=lifecycleMessages.find(v=>v.kind==='birth-home-arrival-ready'&&v.reference.actorId===actor),arrival=arrivalReady.reference,arrivedSource=state(),arrived=worker(arrivedSource),arrivedInspection=await client.inspect();
 if(arrival.bodyId!==r.bodyId||arrival.sourceHome.assignmentSequence!==homeCommit.binding.assignmentSequence||!sameNativeHomeRouteReference(arrival.sourceHome.reference,homeCommit.binding.reference)||arrived.status!=='returning'||arrived.nativeRouteAdmission!=='native-home'||arrived.running||arrived.gateWaiting||pose.some(k=>arrived[k]!==arrival.pose[k])||arrived.heading!==arrival.pose.yaw||!economic(arrivedSource))throw Error('Home absence is not the actual arrived original route/body');
 const arrivedPick=await pick(arrived);await window.captureNativeFarmBirth?.('ordinary-post-settlement-home-arrived');
 Object.assign(progress,{stage:'absence-ready',arrivalReady,arrivedSource,arrivedInspection:snapshot(arrivedInspection),arrivedPick});
 preparer.postMessage({kind:'block-post-settlement-home',stage:'home-arrival-ready',durationMs:1800});
 await wait(()=>blocks.some(v=>v.kind==='birth-block-end'&&v.stage==='home-arrival-ready'),'Home absence READY preparer stall');
 const absenceHeld=await client.inspect(),absenceSource=state(),endpoint=worker(absenceSource);
 if(committed('home-arrival')||endpoint.status!=='returning'||endpoint.nativeRouteAdmission!=='native-home'||pose.some(k=>endpoint[k]!==arrival.pose[k])||!economic(absenceSource))throw Error('Home endpoint disappeared before genuine absence acquisition');
 const absenceHeldPick=await pick(endpoint);Object.assign(progress,{stage:'held-absence-ready',absenceSource,absenceHeld:snapshot(absenceHeld),absenceHeldPick});
 preparer.postMessage({kind:'release-birth-home-arrival-ready',durationMs:1800});
 await wait(()=>committed('home-arrival')&&worker(getConfirmed()).status==='home','ordinary Home20 absence acquisition');await wait(()=>blocks.some(v=>v.kind==='birth-block-end'&&v.stage==='home-arrival-commit'),'Home absence commit preparer stall');
 await wait(()=>getConfirmed().workers.every(w=>w.status==='home'),'both actual expired contracts reach Home',60000);
 await stopSource();await delay(80);const finalSource=state(),after=await client.inspect(),finalConsumer=after.drawExecution.consumer,arrivalCommit=committed('home-arrival'),absent=worker(finalSource),absenceDraws=finalConsumer.samples.filter(v=>v.nativeWorldBoundary?.ticket===arrivalCommit.binding.reference.worldBoundary.ticket);
 if(!absenceDraws.length||arrivalCommit.binding.reference.bodyId!==r.bodyId||absent.status!=='home'||absent.taskId||absent.crateId||absent.nativeRouteAdmission||!economic(finalSource)||finalConsumer.failed||finalConsumer.gpuErrors)throw Error('Home20 lacks actual absent hardware frame or coherent source result');
 const retiredActors=new Set(finalSource.workers.map(w=>Number(w.id.split('-').at(-1)))),matching=finalConsumer.nativeRouteFrame?.bindings.some(v=>[v.nativeHome,v.nativeStart,v.nativeResume,v.nativeAction,v.nativeConsequence,v.nativeSettlement,v.nativeFarmArrival,v.nativeIdleCycle,v.nativeStroll].some(ref=>retiredActors.has(ref?.actorId)));if(matching)throw Error('Home20 retains a presented retired actor motion binding');
 let notSelectable=false;try{await pick(absent);}catch(error){if(error.message!=='Ordinary birth picking missed '+bornId)throw error;notSelectable=true;}if(!notSelectable)throw Error('Actual Home absence remains selectable at its formerly selectable endpoint');
 const notSelectableIds=[bornId];for(const retired of finalSource.workers.filter(w=>w.id!==bornId)){let missing=false;try{await pick(retired);}catch(error){if(error.message!=='Ordinary birth picking missed '+retired.id)throw error;missing=true;}if(!missing)throw Error('Retired peer remains selectable after actual Home absence');notSelectableIds.push(retired.id);}
 if(after.inspectionGeneration!==c.before.inspectionGeneration)throw Error('Home continuation replaced Surface/device ownership');
 const retirements=[];for(const rig of journey.rigs.acquired){
  for(const inspection of [before,held,acquired,arrivedInspection,absenceHeld,after]){const current=inspection.qaBirthRigs.find(v=>v.root===rig.root);if(current&&JSON.stringify(current)!==JSON.stringify(rig))throw Error('Home changed an original CPU rig before its acquired retirement');}
  if(!after.qaBirthRigs.some(v=>v.root===rig.root)){const owner=c.before.qaBirthRigs.some(v=>v.root===rig.root)?c.oldActor:actor,proof=lifecycleMessages.find(v=>v.kind==='birth-resource-committed'&&v.family==='home-arrival'&&v.binding.reference.actorId===owner);if(!proof||finalSource.workers.find(w=>Number(w.id.split('-').at(-1))===owner)?.status!=='home')throw Error('Home lost an actor without its actual absence commit');retirements.push({root:rig.root,actorId:owner,commit:proof});}
 }
 const retained=journey.resourceIdentity.retainedGeometryAndBankIds,trace=after.qaResourceTrace.slice(c.before.qaResourceTrace.length);if(trace.some(v=>v.kind==='destroy'&&retained.includes(v.reference))||trace.some(v=>v.kind==='createShaderModule'&&v.sameSourceAs!==null))throw Error('Home rebuilt invariant geometry/bank or duplicated identical WGSL');
 const absenceReadyBlock=metrics(finalConsumer,'home-arrival-ready'),absenceCommitBlock=metrics(finalConsumer,'home-arrival-commit');
 await window.captureNativeFarmBirth?.('ordinary-post-settlement-home-absence');Object.assign(progress,{stage:'complete',arrivalCommit,finalSource});
 return {notSelectableIds,retirements,ready,commit:homeCommit,actual,drawFrames:draws.length,readyBlock,commitBlock,beforeSource,heldSource,before:snapshot(before),held:snapshot(held),acquired:snapshot(acquired),arrival:{ready:arrivalReady,commit:arrivalCommit,arrivedSource,heldSource:absenceSource,before:snapshot(arrivedInspection),held:snapshot(absenceHeld),drawFrames:absenceDraws.length,readyBlock:absenceReadyBlock,commitBlock:absenceCommitBlock,arrivedPick,heldPick:absenceHeldPick,notSelectable},sourceAfter:finalSource,after:{...snapshot(after),qaResourceTrace:after.qaResourceTrace},retainedIds:retained,scope:'Same actual paid hire and delivered Idle body through ordinary contract Home18 and prepared absence20, with genuine READY delays and endpoint picking before/after. Both expired contracts reach actual Home; rigs remain unchanged until their acquired retirement. No global cadence/next-task/failure acceptance.'};
}
