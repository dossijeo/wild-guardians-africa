from pathlib import Path
import hashlib,json
path='src/rendering/webgpu-worker-roster.js';raw=Path(path).read_bytes();s=raw.decode().replace('\r\n','\n')
def replace(a,b):
 global s
 assert s.count(a)==1,(a[:110],s.count(a));s=s.replace(a,b)
replace('import {nativeIdleCycleBodyState}', 'import {nativeIdleCycleBodyState,nativeSettledIdleSourceMatches}')
replace('export function createWebGpuWorkerRoster(','''// Raycaster uses the live scene. Reuse the same reversible participant to
// query the acquired source, then restore the candidate even if picking fails.
// This synchronous view neither grants a native permission nor invents a clock.
function attachNativeSourcePresentation(part,isActivated){
 let pickingSource=false;
 part.withSourcePresentation=operation=>{
  if(typeof operation!=='function'||pickingSource||!part.valid())throw Error('Native source presentation unavailable');
  const restoreCandidate=isActivated();pickingSource=true;
  try{if(restoreCandidate)part.rollback();const result=operation();if(result&&typeof result.then==='function')throw Error('Native source presentation must be synchronous');return result;}
  finally{try{if(restoreCandidate&&!isActivated())part.activate();}finally{pickingSource=false;}}
 };
 return part;
}
export function createWebGpuWorkerRoster(''')
replace("fromFarm=cycle&&ref.sourceCycleSequence===0&&q.kind==='native-farm-arrival-idle-source';", "fromFarm=cycle&&ref.sourceCycleSequence===0&&q.kind==='native-farm-arrival-idle-source',fromSettlement=cycle&&ref.sourceCycleSequence===0&&q.kind==='native-settled-worker-idle-source';")
replace(':fromFarm?idleCycleContinuesCompletedFarm(q,previous,entry.entity,state.elapsed)', ':fromSettlement?nativeSettledIdleSourceMatches(q,previous.nativeSettlementBinding):fromFarm?idleCycleContinuesCompletedFarm(q,previous,entry.entity,state.elapsed)')
replace('const sourcePhase=fromFarm?', 'const sourcePhase=fromSettlement?idle===null&&e.destinationId===null&&!e.nativeTaskAction:fromFarm?')
replace("e.nativeRouteAdmission===(fromFarm?'native-farm-arrival':fromStroll?'native-idle-stroll':cycle?'native-idle':'pending-idle-resources')", "e.nativeRouteAdmission===(fromSettlement?undefined:fromFarm?'native-farm-arrival':fromStroll?'native-idle-stroll':cycle?'native-idle':'pending-idle-resources')")
a=s.index(' async function prepareNativeStationaryIdleProposal(');end=s.index(' function releaseNativeIdleCycle(',a);region=s[a:end]
assert region.count("pending.stage='preparing';pending.cancel=cancel;return {reused,")==1
region=region.replace("pending.stage='preparing';pending.cancel=cancel;return {reused,", "pending.stage='preparing';pending.cancel=cancel;const part={reused,")
needle='   };\n  }catch(error)';assert region.count(needle)==1
region=region.replace(needle,"   };\n   if(fromSettlement)attachNativeSourcePresentation(part,()=>activated);\n   return part;\n  }catch(error)")
s=s[:a]+region+s[end:]
replace('const strollSourceCurrent=()=>{if(ref.sourceFarm)', 'const strollSourceCurrent=()=>{if(ref.sourceSettlement)return !!previous&&previous.motion.valid()&&nativeSettledIdleSourceMatches(ref.sourceSettlement,previous.nativeSettlementBinding);if(ref.sourceFarm)')
replace("if(ref.sourceFarm)return !!e&&e.status==='arriving'", "if(ref.sourceSettlement)return !!e&&e.status==='idle'&&e.nativeRouteAdmission===undefined&&e.idleState===null&&e.destinationId===null&&!e.nativeTaskAction&&e.profile===ref.workerProfile&&nativeEntityNumericId(e.centerId)===ref.centerId&&!e.taskId&&!e.crateId&&e.path===null&&!e.recovery&&!e.recoveryExitRemaining&&!e.fallRemaining&&!e.incapacitated&&!e.raidReturn&&e.running===false&&e.gateWaiting===false&&e.heading===p.yaw&&['x','z','runPhase','walkPhase','carryPhase','runRemaining'].every(k=>e[k]===p[k]);if(ref.sourceFarm)return !!e&&e.status==='arriving'")
a=s.index('   // Three raycasting reads the live scene.');end=s.index('   return part;',a)
s=s[:a]+'''   if((starting||stroll&&ref.sourceSettlement)&&previous?.nativeSettlementBinding)attachNativeSourcePresentation(part,()=>activated);
'''+s[end:]
out='.cache/native-settled-idle-consumer-draft-webgpu-worker-roster.js';Path(out).write_bytes(s.encode())
Path('.cache/native-settled-idle-consumer-roster-draft.json').write_text(json.dumps({'scope':'UNRUN cache draft only; original roster/source/tests unchanged. Source activation is passed as a private closure, no new participant interface field.','baseInputs':{path:hashlib.sha256(raw).hexdigest()},'drafts':[out]},indent=2)+'\n')
print('Prepared unrun roster draft, same original actor/binding/source view; originals unchanged.')
