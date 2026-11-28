from pathlib import Path
import hashlib,json
originals={}
def draft(path,pairs):
 p=Path(path);data=p.read_bytes();s=data.decode().replace('\r\n','\n');originals[path]=hashlib.sha256(data).hexdigest()
 for a,b in pairs:
  assert s.count(a)==1,(path,a[:110],s.count(a));s=s.replace(a,b)
 out=Path('.cache/native-settled-idle-consumer-draft-'+p.name);out.write_bytes(s.encode());return str(out)
body=draft('src/world/native-idle-cycle-body-source.js',[(
 '// Common read view, not a new semantic request.',
 '''// Correlate bounded native17 metadata with an already validated acquired
// settlement. This structural relation is not an execution or GPU permission.
// Worker animation profile/bodyFlags are absent from the old public17 proof;
// never infer them. Native issued associations and the live actor still check
// the full new reference before installation/drawing.
export function nativeSettledIdleSourceMatches(value,proof){
 try{const q=copyNativeIdleCycleBodySource(value),r=proof?.reference,w=r?.worldBoundary;
  return q.kind==='native-settled-worker-idle-source'&&proof?.kind==='native-task-settlement-attestation'&&proof.version===1&&!r.home&&q.sourceSequence===proof.settlementSequence&&q.sourceAt===w.effectiveTime&&q.authorityEpoch===w.authorityEpoch&&q.nativeSession===w.nativeSession&&['actorId','bodyId','centerId','profile'].every(k=>q[k]===r[k])&&poseFields.every(k=>q.pose[k]===r.pose[k]);
 }catch{return false;}
}
// Common read view, not a new semantic request.''')])
control=draft('src/rendering/native-route-control.js',[
 ("import {nativeIdleCycleBodyState}","import {nativeIdleCycleBodyState,nativeSettledIdleSourceMatches}"),
 ('const strollIssuedSourceMatches=(reference,record)=>reference.sourceFarm?', 'const strollIssuedSourceMatches=(reference,record)=>reference.sourceSettlement?!!record.sourceSettledApproach&&JSON.stringify(reference.sourceSettlement)===JSON.stringify(record.sourceSettledApproach):reference.sourceFarm?'),
 ("    const completedFarmStroll=event.type", "    const settledStroll=!!stroll?.reference.sourceSettlement&&settledIdlePreparationSourceMatches(stroll.reference.sourceSettlement,actor)&&settledIdlePreparationSourceMatches(stroll.preparedReference.sourceSettlement,actor);\n    const completedFarmStroll=event.type"),
 ("(stroll.reference.sourceFarm?!completedFarmStroll:","(stroll.reference.sourceSettlement?!settledStroll:stroll.reference.sourceFarm?!completedFarmStroll:"),
 ('const sourceFarmApproach=completedFarmStroll?', 'const sourceSettledApproach=settledStroll?stroll.reference.sourceSettlement:null;\n    const sourceFarmApproach=completedFarmStroll?'),
 ('sourceCompletedStroll,sourceFarmApproach,sourceTaskRequest,','sourceCompletedStroll,sourceFarmApproach,sourceSettledApproach,sourceTaskRequest,'),
 ('    const r=binding.reference,proof=actor?.idleCycleProof,previous=proof?.reference,record=actor?.idleCycleRecord;', '''    const r=binding.reference,proof=actor?.idleCycleProof,previous=proof?.reference,record=actor?.idleCycleRecord;
    // Acquired17 uses a native origin-modulo Idle clock. Retain that phase
    // at the actual21 commit, not its prepared epoch or a Game wall clock.
    // The existing host drops phaseDelay at REST->WATCH's native knot.
    if(r.sourceCycleSequence===0&&r.sourceBody.kind==='native-settled-worker-idle-source'&&settledIdlePreparationSourceMatches(r.sourceBody,actor))return r.worldBoundary.effectiveTime;'''),
 ('  function cyclePreparationSourceMatches(reference,actor){', '''  function settledIdlePreparationSourceMatches(value,actor){
    const proof=actor?.settlementProof;
    return !!proof&&!closed&&!!clock&&!actor.closed&&actors.get(value?.actorId)===actor&&actor.state===7&&actor.current===null&&actor.latestSequence===proof.settlementSequence&&proof.settlementSequence<=clock.intentSequence&&!actor.pendingTaskRequest&&!actor.pendingHomeRequest&&settlementRecordCurrent(proof.reference,actor)&&nativeSettledIdleSourceMatches(value,proof);
  }
  function cyclePreparationSourceMatches(reference,actor){'''),
 ("    if(reference.sourceCycleSequence===0&&reference.sourceBody.kind==='native-idle-stroll-failed-source'){", "    if(reference.sourceCycleSequence===0&&reference.sourceBody.kind==='native-settled-worker-idle-source')return settledIdlePreparationSourceMatches(reference.sourceBody,actor);\n    if(reference.sourceCycleSequence===0&&reference.sourceBody.kind==='native-idle-stroll-failed-source'){"),
 ("fromFarm=reference.sourceCycleSequence===0&&reference.sourceBody.kind==='native-farm-arrival-idle-source',source=", "fromFarm=reference.sourceCycleSequence===0&&reference.sourceBody.kind==='native-farm-arrival-idle-source',fromSettlement=reference.sourceCycleSequence===0&&reference.sourceBody.kind==='native-settled-worker-idle-source',source="),
 ('fromFarm?actor?.farmArrivalProof:actor?.initialIdleBodyProof,next=', 'fromFarm?actor?.farmArrivalProof:fromSettlement?actor?.settlementProof:actor?.initialIdleBodyProof,next='),
 ('(fromFailed?actor.pendingIdleStrollRequest===source', '(fromSettlement?actor.settlementProof===source&&cyclePreparationSourceMatches(reference,actor):fromFailed?actor.pendingIdleStrollRequest===source'),
 ('boundary=copyNativeWorldBoundary(preparingWorldBoundary),source=reference.sourceFarm?actor?.farmArrivalProof:', 'boundary=copyNativeWorldBoundary(preparingWorldBoundary),source=reference.sourceSettlement?actor?.settlementProof:reference.sourceFarm?actor?.farmArrivalProof:'),
 ('pending=()=>!!source&&(reference.sourceFarm?', 'pending=()=>!!source&&(reference.sourceSettlement?actor.settlementProof===source&&settledIdlePreparationSourceMatches(reference.sourceSettlement,actor):reference.sourceFarm?')])
Path('.cache/native-settled-idle-consumer-control-draft.json').write_text(json.dumps({'scope':'UNRUN draft only. Original source/test/runtime files untouched during coordinated GPU window. No phase continuity or producer claim.','baseInputs':originals,'drafts':[body,control]},indent=2)+'\n')
print('Prepared source-only drafts; no original file modified, no tests or compilation run.')
