import {mainRetainedResourceReuse} from '../../experiments/native-resource-ownership.mjs';

// Evidence checks only; never owns resources or certifies an A5/A6 gate.
export function assessA5(report){
  const violations=[],require=(ok,reason)=>{if(!ok)violations.push(reason);};
  const reuse=mainRetainedResourceReuse(report);require(reuse.accepted,'settled-main-reuse');
  const demand=report.before?.renderer?.farCoverage;
  require(demand?.wanted>0&&demand.offered===demand.wanted&&demand.pending===null&&demand.deferred===0,'baseline-demand-complete');
  const cold=report.coldStart?.renderer,progress=report.farWarmup;
  require(cold?.qaA5&&Number.isFinite(cold.drawExecution?.resourcesCreated)&&progress?.length>0&&progress.every(s=>Number.isFinite(s.far?.wanted)&&Number.isFinite(s.far?.offered)&&Number.isFinite(s.created)&&Number.isFinite(s.admission?.compilesStarted))&&progress.at(-1).far.offered===demand?.wanted&&progress.some(s=>s.far.offered>cold.farCoverage?.offered),'cold-and-progressive-evidence');
  const phases=report.a5;
  require(phases?.local?.before&&phases.local.after&&phases.cancel?.after&&phases.retire?.after,'complete-scenarios');
  if(!phases?.retire?.after||!phases.local?.after||!phases.cancel?.after)return {accepted:false,violations,reuse};
  const a5=s=>s?.renderer?.qaA5,base=a5(report.before),chunk=phases.chunk;
  require(base?.live?.length>0&&base.missing?.length===0,'complete-owner-inventory');
  for(const [i,s]of [...(report.noRecoveryControl??[]),...(report.recoveries??[]).map(r=>r.after)].entries()){
    const next=a5(s);require(next&&JSON.stringify(next.atlases)===JSON.stringify(base?.atlases)&&JSON.stringify(next.textures)===JSON.stringify(base?.textures)&&JSON.stringify(next.live)===JSON.stringify(base?.live)&&next.createdPairs===base?.createdPairs,'far-identities-'+i);
  }
  const isTarget=p=>p.cx===chunk?.cx&&p.cz===chunk?.cz;
  const content=p=>({material:p.source?.materialId,attributes:p.source?.attributes.map(a=>[a.name,a.bytes,a.itemSize,a.hash])});
  for(const [name,phase]of [['local',phases.local],['cancel',phases.cancel]]){
    const before=a5(phase.before),after=a5(phase.after);
    require(before&&after&&before.missing.length===0&&after.missing.length===0,'inventory-'+name);
    if(!before||!after)continue;
    require(JSON.stringify(before.live.filter(p=>!isTarget(p)))===JSON.stringify(after.live.filter(p=>!isTarget(p))),'unaffected-owners-'+name);
    const old=before.live.filter(isTarget),next=after.live.filter(isTarget);
    require(old.length>0&&next.length>0&&old.every(p=>!next.some(q=>q.id===p.id)&&after.retired.includes(p.id)),'replacement-and-retirement-'+name);
    const released=new Set(phase.after.renderer.qaResourceTrace?.filter(e=>e.kind==='destroy').map(e=>e.reference)??[]);
    require(old.every(p=>[...p.model.attributes,...p.impostor.attributes].every(a=>!a.reference||released.has(a.reference))),'replaced-private-buffers-released-'+name);
    require(JSON.stringify(old.map(content))===JSON.stringify(next.map(content)),'unchanged-source-content-'+name);
    require(after.live.every(p=>p.source&&!p.source.geometryDisposed&&!p.source.materialDisposed&&!p.model.geometryDisposed&&!p.model.materialDisposed&&!p.impostor.geometryDisposed&&!p.impostor.materialDisposed),'live-resources-'+name);
    require(phase.after.renderer.drawExecution.consumer.gpuErrors===0,'gpu-'+name);
  }
  const cancelled=a5(phases.cancel.after)?.events.filter(e=>e.kind==='cancel-request')??[];
  require(cancelled.length===1&&a5(phases.cancel.after).retired.includes(cancelled[0].pair),'cancelled-candidate-retired');
  const last=a5(phases.retire.after),prior=a5(phases.retire.before);
  require(last?.atlases?.length>0&&last.atlases.every(a=>a?.closed&&a.retained===0)&&last.textures?.length>0&&last.textures.every(t=>t.disposed),'atlas-leases-and-textures-released');
  require(last?.coverage?.closed===true&&last.live.length===0&&last.missing.length===0&&phases.retire.drained===true,'final-retirement-and-drain');
  require(JSON.stringify(phases.retire.before.renderer.qaResidentOwners.actors)===JSON.stringify(phases.retire.after.renderer.qaResidentOwners.actors),'unrelated-actors-survive');
  require(phases.retire.after.ui?.hasCurrent===true&&phases.retire.after.renderer.drawExecution.consumer.gpuErrors===0,'retained-frame-after-retirement');
  const privateBuffers=new Set(prior?.live.flatMap(p=>[...p.model.attributes,...p.impostor.attributes].map(a=>a.reference).filter(Boolean))??[]);
  const destroyed=new Set(phases.retire.after.renderer.qaResourceTrace?.filter(r=>r.kind==='destroy').map(r=>r.reference)??[]);
  // WebGPU INDEX=16, VERTEX=32. Existing factory scopes identify buffers even
  // for cancelled candidates absent from the published-owner inventory.
  const attributed=(phases.retire.after.renderer.qaResourceTrace??[]).filter(e=>e.kind==='createBuffer'&&(e.usage&48)&&/^a5-far-(model|impostor)$/.test(e.scope?.origin?.namespace));
  require(attributed.length>0&&attributed.every(e=>e.reference&&destroyed.has(e.reference)),'all-attributed-far-geometry-buffers-released');
  require(privateBuffers.size>0&&[...privateBuffers].every(id=>destroyed.has(id)),'private-buffers-released');
  for(const p of base?.live??[]){
    const sourceRefs=new Set(p.source?.attributes.map(a=>a.reference).filter(Boolean));
    require(p.model.attributes.every(a=>!a.reference||!sourceRefs.has(a.reference)),'independent-gpu-lifetimes-'+p.id);
    require(p.copies.every(c=>!c.attributeShared&&!c.cpuBufferShared&&c.bytesEqual),'observed-copy-contract-'+p.id);
  }
  require(report.errors?.length===0&&report.httpFailures?.length===0&&report.requestErrors?.length===0,'browser-errors');
  return {accepted:violations.length===0,violations,reuse,privateBuffersChecked:privateBuffers.size,attributedGeometryBuffersChecked:attributed.length,scope:'A–F instrumented component evidence; no gate closure, driver-memory bound, minimum allocation or cadence claim.'};
}
