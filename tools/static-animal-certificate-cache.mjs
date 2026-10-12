// One positive static certificate per native proof view. Workers are deliberately
// excluded: their access is checked separately on every query.
const entries=new WeakMap();
const openRoutes=new WeakMap();
import {proofGeometrySignature} from './proof-geometry-signature-candidate.mjs';
export function staticAnimalCertificate(state,view,plan,bounds,outline,compute,{cache=true,extend=null,gateAnimationInvariant=false}={}){
 const field=view.field;
 const targets=state.plants.filter(p=>p.alive).map(p=>[p.id,p.x,p.z,p.kind,p.centerId,p.species]),targetKey=JSON.stringify(targets);
 const signature=proofGeometrySignature([view.version,plan,bounds,outline,
  view.obstacles,state.structures,state.villages,state.culture,state.suppressed,
  field?.c,field?.settlementSite,field?.seed,field?.phase,field?.riverLevel,
  field?.canyon,field?.riverActive,field?.pondsActive,field?.wetland,field?.desert,field?.featureCell],gateAnimationInvariant);
 const methods=[field,field?.heightCache,field?.height,field?.surface,field?.slope,field?.waterInfo,
  field?.raw,field?.naturalHeight,field?.riverBase,field?.riverX,field?.nearbyPonds,
  view.walkable,view.segmentClear,view.approachPath,view.approachGroupBlocked,view.testWalkable,view.testSegmentClear,
  view.terrainValid,view.propsAt];
 // Reuse only physically demonstrated open routes under exactly these inputs.
 // Search exhaustion, absence of proof and worker failures are not witnesses.
 const negative=cache?openRoutes.get(view):null;
 if(negative?.state===state&&negative.signature===signature&&negative.targetKey===targetKey&&methods.every((value,i)=>value===negative.methods[i]))return structuredClone(negative.proof);
 const old=cache?entries.get(view):null;
 if(old?.state===state&&old.signature===signature&&methods.every((value,i)=>value===old.methods[i])){
  if(old.targetKey===targetKey)return structuredClone(old.proof);
  // A harvested anchor remains a geometric reference, never a live target.
  // Keep the original exterior origin and sampled poses: deleting crops changes
  // neither terrain/obstacles nor the positive coverage of surviving targets.
  const liveIds=new Set(targets.map(target=>target[0])),checks=old.proof.checks;
  const certifiedIds=new Set(old.targets.map(target=>target[0]));
  const anchored=targets.length>0&&Array.isArray(checks)&&checks.length>0&&checks.every(check=>certifiedIds.has(check.anchorTargetId)&&[check.inside?.x,check.inside?.z,check.outside?.x,check.outside?.z].every(Number.isFinite));
  let index=0;
  if(anchored)for(const target of old.targets)if(index<targets.length&&JSON.stringify(target)===JSON.stringify(targets[index]))index++;
  if(anchored&&index===targets.length){
   const proof=structuredClone(old.proof);
   proof.retainedCoverage={certifiedCropCount:old.targets.length,currentCropCount:targets.length,removedCropIds:old.targets.filter(target=>!liveIds.has(target[0])).map(target=>target[0]),retiredAnchorTargetIds:[...new Set(checks.map(check=>check.anchorTargetId).filter(id=>!liveIds.has(id)))],scope:'Positive superset certificate; surviving targets unchanged. Original anchor coordinates and exterior origins remain geometric references, not necessarily living targets. Counters describe original certification.'};
   return proof;
  }
  // Opt-in experiment: unchanged surviving tuples may share the original
  // geometry certificate, but each added target needs a fresh physical proof.
  const original=new Map(old.targets.map((target,i)=>[target[0],{target,index:i}]));
  let previous=-1,unchanged=anchored&&new Set(targets.map(t=>t[0])).size===targets.length;
  for(const target of targets){const prior=original.get(target[0]);if(!prior)continue;
   if(prior.index<=previous||JSON.stringify(prior.target)!==JSON.stringify(target)){unchanged=false;break;}previous=prior.index;
  }
  const added=targets.filter(target=>!original.has(target[0]));
  if(extend&&unchanged&&added.length){
   const proof=extend(structuredClone(old.proof),state.plants.filter(p=>p.alive&&added.some(t=>t[0]===p.id)));
   if(proof.valid===true){
    const certifiedTargets=[...old.targets,...added],liveIds=new Set(targets.map(t=>t[0]));
    proof.retainedCoverage={certifiedCropCount:certifiedTargets.length,currentCropCount:targets.length,removedCropIds:certifiedTargets.filter(t=>!liveIds.has(t[0])).map(t=>t[0]),retiredAnchorTargetIds:[...new Set(checks.map(c=>c.anchorTargetId).filter(id=>!liveIds.has(id)))],scope:'Original positive target coverage retained; new targets physically certified from original exterior origins and 32-pose conventions. Geometry and surviving target tuples unchanged.'};
    entries.set(view,{state,signature,methods,targets:certifiedTargets,targetKey,proof:structuredClone(proof)});
   }
   // Failed additions are never cached as positive or interpreted as coverage.
   return proof;
  }
 }
 const proof=compute();
 if(cache&&proof.valid===false&&['native-service-direct-route-open','native-service-route-open'].includes(proof.reason))openRoutes.set(view,{state,signature,methods,targetKey,proof:structuredClone(proof)});
 else openRoutes.delete(view);
 if(cache&&proof.valid===true)entries.set(view,{state,signature,methods,targets,targetKey,proof:structuredClone(proof)});
 else entries.delete(view);
 return proof;
}
