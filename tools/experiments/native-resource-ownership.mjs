// Evidence classifier for the real Worker/GPU audit, not an allocation owner.
export function nativeResourceOwnership(result){
 const {before,after}=result,trace=after.qaResourceTrace.slice(before.qaResourceTrace.length).filter(r=>r.kind.startsWith('create'));
 const effects=new Set((after.agricultureVfx?.active??[]).filter(e=>!(before.agricultureVfx?.active??[]).some(old=>old.id===e.id)).filter(e=>e.family==='footstep').map(e=>e.id));
 const demands=after.qaDepthDemands??[],historical=before.qaResourceTrace??[],factories=[],unattributed=[];
 const identified=value=>Number.isSafeInteger(value)&&value>=0;
 const matchingEffect=origin=>origin?.namespace==='footstep-samples'&&identified(origin.resourceOwner)&&effects.has(origin.effect);
 const footstep=scope=>scope&&matchingEffect(scope.footstepOrigin);
 for(const record of trace){
  const scope=record.scope;let owner=null;
  if(scope?.kind==='texture'&&scope.origin?.namespace==='vfx-atlas'&&identified(scope.origin.resourceOwner)&&identified(scope.texture)&&effects.size)owner={kind:'vfx-atlas',resourceOwner:scope.origin.resourceOwner,texture:scope.texture};
  else if(scope?.kind==='texture'&&matchingEffect(scope.origin))owner={kind:'footstep-texture',...scope.origin,texture:scope.texture};
  else if(scope?.kind==='texture'&&footstep(scope.parent))owner={kind:'footstep-texture-in-object',effect:scope.parent.footstepOrigin.effect,object:scope.parent.object,texture:scope.texture};
  else if(footstep(scope)&&identified(scope.object)&&identified(scope.geometry)&&identified(scope.material))owner={kind:'footstep-object',effect:scope.footstepOrigin.effect,object:scope.object,geometry:scope.geometry,material:scope.material,pass:scope.pass};
  else if(scope?.origin?.namespace==='ground-depth-proxy'&&scope.target?.origin?.namespace==='ground-depth-target'&&identified(scope.origin.owner)&&typeof scope.origin.target==='string'&&scope.origin.target.length>0&&scope.origin.owner===scope.target.origin.owner&&scope.origin.target===scope.target.uuid&&identified(scope.geometry)&&scope.geometry===scope.origin.geometry&&before.qaNativeBufferOwners.some(b=>b.mesh===scope.origin.source&&b.geometry===scope.geometry)&&demands.some(d=>d.target===scope.target.uuid&&d.reason==='vfx-soft-depth')&&(record.kind!=='createBuffer'||((record.usage&64)&&!(record.usage&~(64|8|4)))))owner={kind:'vfx-ground-depth',...scope.origin,material:scope.material};
  else if(record.kind==='createBindGroup'&&scope?.kind==='compile-object'&&identified(scope.object)&&identified(scope.geometry)&&identified(scope.material)&&historical.some(r=>r.scope?.object===scope.object&&r.scope?.geometry===scope.geometry&&r.scope?.material===scope.material))owner={kind:'existing-render-context-binding',object:scope.object,geometry:scope.geometry,material:scope.material};
  const row={index:record.index,kind:record.kind,reference:record.reference,owner};factories.push(row);if(!owner)unattributed.push({...row,scope});
 }
 const counts=Object.fromEntries(Object.keys(result.factoryDelta).map(kind=>[kind,trace.filter(r=>r.kind===kind).length]));
 const completeFactoryCounts=trace.every(r=>Object.hasOwn(result.factoryDelta,r.kind))&&Object.entries(result.factoryDelta).every(([kind,value])=>counts[kind]===value);
 const snapshots=result.resourceChanges.forks.map(f=>{
  const writers=(f.writerScopes??[]).filter(s=>s.sameEntry===true&&s.role==='active'&&Number.isSafeInteger(s.sequence)&&s.pins>0&&!s.hidden&&!s.mutationHeld&&s.clocks.some(c=>c.native&&c.current&&f.offset<c.byteOffset+4&&c.byteOffset<f.offset+f.byteLength));
  return {id:f.id,nativeChangedBytes:f.nativeChangedBytes,writers,qualified:Number.isSafeInteger(f.nativeChangedBytes)&&f.nativeChangedBytes>=0&&writers.length>0};
 });
 const completeSnapshotCounts=new Set(snapshots.map(s=>s.id)).size===snapshots.length&&snapshots.length===after.drawExecution.consumer.uniformForks-before.drawExecution.consumer.uniformForks;
 return {accepted:completeFactoryCounts&&completeSnapshotCounts&&unattributed.length===0&&snapshots.every(s=>s.qualified),scope:'Native writer lifetime and actual factory origins; not minimum allocation or cadence acceptance.',completeFactoryCounts,completeSnapshotCounts,counts,factories,unattributed,snapshots};
}
