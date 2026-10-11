// One positive static certificate per native proof view. Workers are deliberately
// excluded: their access is checked separately on every query.
const entries=new WeakMap();
export function staticAnimalCertificate(state,view,plan,bounds,outline,compute,{cache=true}={}){
 const field=view.field;
 const targets=state.plants.filter(p=>p.alive).map(p=>[p.id,p.x,p.z,p.kind,p.centerId,p.species]),targetKey=JSON.stringify(targets);
 const signature=JSON.stringify([view.version,plan,bounds,outline,
  view.obstacles,state.structures,state.villages,state.culture,state.suppressed,
  field?.c,field?.settlementSite,field?.seed,field?.phase,field?.riverLevel,
  field?.canyon,field?.riverActive,field?.pondsActive,field?.wetland,field?.desert,field?.featureCell]);
 const methods=[field,field?.heightCache,field?.height,field?.surface,field?.slope,field?.waterInfo,
  field?.raw,field?.naturalHeight,field?.riverBase,field?.riverX,field?.nearbyPonds,
  view.walkable,view.segmentClear,view.approachPath,view.approachGroupBlocked,view.testWalkable,view.testSegmentClear,
  view.terrainValid,view.propsAt];
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
 }
 const proof=compute();
 if(cache&&proof.valid===true)entries.set(view,{state,signature,methods,targets,targetKey,proof:structuredClone(proof)});
 else entries.delete(view);
 return proof;
}
