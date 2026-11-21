import {sameNativeTaskStartReference} from '../../src/world/native-task-start-reference.js';

// Observe the original authority's next ordinary crop assignment. Retain and
// release its genuine READY; the page never grants a physical permission.
export async function auditPostSettlementTask(c,settlement,journey){
 const {client,preparer,wait,delay,getConfirmed,lifecycleMessages,blocks,publications,bornId,pick,stopSource}=c;
 if(!settlement)throw Error('Next Task has no actual preceding settlement');
 const actor=Number(bornId.split('-').at(-1)),progress={stage:'waiting-for-next-task'},state=()=>structuredClone(getConfirmed()),worker=s=>s.workers.find(w=>w.id===bornId),pose=['x','z','heading','runPhase','walkPhase','carryPhase','runRemaining'];
 window.nativePostSettlementTaskProgress=progress;
 const economic=s=>JSON.stringify(s.ledger)===JSON.stringify(settlement.sourceAfter.ledger)&&s.crates.find(v=>'deliver:'+v.id===settlement.economic.entryId)?.delivered===true;
 const committed=()=>lifecycleMessages.find(v=>v.kind==='birth-resource-committed'&&v.family==='task-start'&&v.binding.reference.actorId===actor&&v.binding.reference.targetId===900100);
 await wait(()=>lifecycleMessages.some(v=>v.kind==='birth-next-task-ready'),'second ordinary harvest and genuine Task READY',100000);
 const ready=lifecycleMessages.find(v=>v.kind==='birth-next-task-ready'),r=ready.reference,beforeSource=state(),beforeWorker=worker(beforeSource),target=beforeSource.plants.find(v=>v.id==='plant-900100'),task=beforeSource.tasks.find(v=>v.workerId===bornId&&v.targetId===target?.id);
 Object.assign(progress,{stage:'next-task-ready',ready,beforeSource});
 if(r.actorId!==actor||r.bodyId!==settlement.commit.binding.reference.bodyId||r.targetId!==900100||r.taskId===journey.replacement.committed.binding.reference.taskId||r.requestSequence<=journey.replacement.committed.binding.reference.requestSequence||r.worldBoundary.authorityEpoch!==settlement.commit.binding.reference.worldBoundary.authorityEpoch||r.worldBoundary.nativeSession!==settlement.commit.binding.reference.worldBoundary.nativeSession||r.worldBoundary.ticket<=settlement.commit.binding.reference.worldBoundary.ticket||!target?.alive||!target.harvestRequested||!task||task.id!=='task-'+r.taskId||beforeWorker.status!=='waiting-task'||beforeWorker.nativeRouteAdmission!=='pending-resources'||beforeWorker.taskId!==task.id||beforeWorker.crateId||beforeWorker.path!==null||!economic(beforeSource))throw Error('Next Task does not continue the actual settled worker, body and ordinary queue');
 const before=await client.inspect();Object.assign(progress,{before});
 preparer.postMessage({kind:'block-post-settlement-task',stage:'next-task-ready',durationMs:1800});
 await wait(()=>blocks.some(v=>v.kind==='birth-block-end'&&v.stage==='next-task-ready'),'next Task READY preparer stall');
 const held=await client.inspect(),heldSource=state(),heldWorker=worker(heldSource);
 Object.assign(progress,{stage:'held-next-task-ready',held,heldSource});
 if(committed()||heldWorker.status!=='waiting-task'||heldWorker.nativeRouteAdmission!=='pending-resources'||heldWorker.taskId!==task.id||pose.some(k=>heldWorker[k]!==beforeWorker[k])||!economic(heldSource))throw Error('Next Task moved or changed its first delivery before genuine acquisition');
 const heldPick=await pick(heldWorker);
 preparer.postMessage({kind:'release-birth-next-task-ready',durationMs:1800});
 await wait(committed,'second ordinary Task14 acquisition');
 await wait(()=>blocks.some(v=>v.kind==='birth-block-end'&&v.stage==='next-task-commit'),'next Task commit preparer stall');
 await stopSource();await delay(80);const sourceAfter=state(),after=await client.inspect(),consumer=after.drawExecution.consumer,commit=committed(),actual=consumer.nativeRouteFrame?.bindings.find(v=>v.nativeStart?.actorId===actor&&v.nativeStart.targetId===900100),draws=consumer.samples.filter(v=>v.nativeWorldBoundary?.ticket===commit.binding.reference.worldBoundary.ticket),current=worker(sourceAfter);
 Object.assign(progress,{stage:'next-task-acquired',commit,actual,after,sourceAfter});
 if(!actual||!draws.length||!sameNativeTaskStartReference(actual.nativeStart,commit.binding.preparedReference)||actual.executionEpoch!==commit.binding.reference.worldBoundary.effectiveTime||commit.binding.reference.bodyId!==r.bodyId||current.taskId!==task.id||current.nativeRouteAdmission!=='native-task'||!economic(sourceAfter)||consumer.failed||consumer.gpuErrors||after.inspectionGeneration!==c.before.inspectionGeneration)throw Error('Second Task14 has no original hardware body/frame, execution origin or economic continuity');
 for(const rig of journey.rigs.acquired)for(const inspection of [before,held,after])if(JSON.stringify(inspection.qaBirthRigs.find(v=>v.root===rig.root))!==JSON.stringify(rig))throw Error('Next Task rebuilt or changed an original CPU rig');
 for(const owner of journey.owners.after.actors){const next=after.qaResidentOwners.actors.find(v=>v.root===owner.root);if(!next||JSON.stringify(next.bones)!==JSON.stringify(owner.bones)||owner.meshes.some(m=>!next.meshes.some(n=>n.id===m.id&&n.geometry===m.geometry)))throw Error('Next Task replaced an original actor or geometry');}
 const retained=journey.resourceIdentity.retainedGeometryAndBankIds,trace=after.qaResourceTrace.slice(c.before.qaResourceTrace.length);
 if(trace.some(v=>v.kind==='destroy'&&retained.includes(v.reference))||trace.some(v=>v.kind==='createShaderModule'&&v.sameSourceAs!==null))throw Error('Next Task rebuilt invariant resources or duplicated identical WGSL');
 const bank=after.workers.assets.profiles.find(v=>v.profile===c.born.profile);if(bank?.refs!==2||bank.pending!==0||after.workers.native!==2)throw Error('Next Task replaced its shared bank or native roster');
 const metrics=stage=>{const b=blocks.find(v=>v.kind==='birth-block-end'&&v.stage===stage),s=consumer.samples.filter(v=>v.at>=b.start&&v.at<b.end),p=publications.filter(v=>v.at>=b.start&&v.at<b.end),gaps=s.slice(1).map((v,i)=>v.at-s[i].at);if(s.length<4||p.length<4||s.at(-1).clockElapsed-s[0].clockElapsed<.5)throw Error('Next Task preparation stopped source or hardware clock');return {...b,drawFrames:s.length,confirmedPublications:p.length,clockAdvance:s.at(-1).clockElapsed-s[0].clockElapsed,maxGapMs:Math.max(...gaps)};};
 const inputPick=await pick(current),peerPick=await pick(sourceAfter.workers.find(w=>w.id===c.oldId)),readyBlock=metrics('next-task-ready'),commitBlock=metrics('next-task-commit');
 await window.captureNativeFarmBirth?.('ordinary-post-settlement-next-task');Object.assign(progress,{stage:'complete'});
 return {ready,commit,actual,drawFrames:draws.length,beforeSource,heldSource,sourceAfter,before,held,after,heldPick,inputPick,peerPick,readyBlock,commitBlock,retainedIds:retained,scope:'Same paid newborn completes its first delivery, then actual ordinary Game crop maturity/queue assigns a second Task14 on its original body, authority and Surface. Genuine READY delay and picks; not second action/delivery, Home, global recovery or cadence acceptance.'};
}
