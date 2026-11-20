from pathlib import Path
import hashlib,json
originals={};outputs=[]
def draft(path,pairs):
 p=Path(path);raw=p.read_bytes();s=raw.decode().replace('\r\n','\n');originals[path]=hashlib.sha256(raw).hexdigest()
 for a,b in pairs:
  assert s.count(a)==1,(path,a[:100],s.count(a));s=s.replace(a,b)
 out='.cache/native-settled-idle-consumer-draft-'+p.name;Path(out).write_bytes(s.encode());outputs.append(out)
draft('src/world/wild-engine/spatial-intent-bridge.js',[
 ('  const prepareNativeIdleCycleProposal=actorId=>{', '''  // Reuse the actual17 source reader and the existing finite21/22 mechanisms.
  // This is bounded semantic metadata, never a new body or native permission.
  const nativeSettledIdleSource=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId),source=idleCycleSource(actor);if(!source?.sourceSettlement)return null;
    const {body,anchor}=source;return Object.freeze({body,anchor:Object.freeze({...anchor}),approach:Math.hypot(body.pose.x-anchor.x,body.pose.z-anchor.z)>anchor.radius});
  };
  const prepareNativeIdleCycleProposal=actorId=>{'''),
 ('nativeFarmArrivalDeclarationReference,nativeFarmArrivalIdleSource,', 'nativeFarmArrivalDeclarationReference,nativeFarmArrivalIdleSource,nativeSettledIdleSource,'),
 ('''  const farmIdleAdmissionCurrent=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId),state=observedTaskState??sourceState,worker=state?.workers.find(w=>numericId(w.id)===actor);
    if(worker?.nativeRouteAdmission!=='native-farm-arrival')return ()=>true;
    const source=nativeFarmArrivalIdleSource(actor),identity=source&&JSON.stringify(source);
    return ()=>!!identity&&JSON.stringify(nativeFarmArrivalIdleSource(actor))===identity;
  };''', '''  const nativeSettledIdleSource=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId),state=observedTaskState??sourceState,worker=state?.workers.find(w=>numericId(w.id)===actor);
    if(!worker||worker.status!=='idle'||worker.nativeRouteAdmission||dirty||pendingTaskEvents.length||pendingWorldEvents.length||lastPlan?.some(r=>r.status===1&&r.workerId===actor))return null;
    return bridge.nativeSettledIdleSource(actor);
  };
  const farmIdleAdmissionCurrent=actorId=>{
    const actor=typeof actorId==='number'?actorId:numericId(actorId),state=observedTaskState??sourceState,worker=state?.workers.find(w=>numericId(w.id)===actor),farm=worker?.nativeRouteAdmission==='native-farm-arrival',settled=worker?.status==='idle'&&!worker.nativeRouteAdmission&&!!bridge.nativeTaskSettlementBinding(actor);
    if(!farm&&!settled)return ()=>true;
    const read=farm?nativeFarmArrivalIdleSource:nativeSettledIdleSource,source=read(actor),identity=source&&JSON.stringify(source);
    return ()=>!!identity&&JSON.stringify(read(actor))===identity;
  };'''),
 ('    nativeFarmArrivalIdleSource,nativeFarmArrivalRequestReference:', '    nativeSettledIdleSource,nativeFarmArrivalIdleSource,nativeFarmArrivalRequestReference:')])
draft('src/simulation/native-intent-production.js',[
 ("   if(marker==='native-farm-arrival-held'", "   if(!marker&&worker.status==='idle'){const settledIdleSource=planner.nativeSettledIdleSource?.(actorId);if(settledIdleSource){const stroll=settledIdleSource.approach;return {actorId,kind:stroll?'idle-stroll':'idle-cycle',operation:stroll?'startNativeIdleStrollAfterGpuQuiescence':'startNativeIdleCycleAfterGpuQuiescence',prepare:stroll?'prepareNativeIdleStrollResources':'prepareNativeIdleCycleResources',settledIdleSource};}}\n   if(marker==='native-farm-arrival-held'"),
 ("case 'idle-stroll':return JSON.stringify(request.farmIdleSource??", "case 'idle-stroll':return JSON.stringify(request.farmIdleSource??request.settledIdleSource??"),
 ("case 'idle-cycle':return JSON.stringify(request.farmIdleSource??", "case 'idle-cycle':return JSON.stringify(request.farmIdleSource??request.settledIdleSource??")])
Path('.cache/native-settled-idle-consumer-production-draft.json').write_text(json.dumps({'scope':'UNRUN candidate only. Do not enable until control/graphics/interruption/authority validation; all original sources untouched during shared GPU window.','baseInputs':originals,'drafts':outputs},indent=2)+'\n')
print('Prepared ordinary-selector/current-source drafts; original production remains disabled.')
