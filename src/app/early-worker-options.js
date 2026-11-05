// The early authority is configured before the presentation exists. Keep its
// capabilities explicit so a product bootstrap does not depend on QA URLs.
export function earlyWorkerOptions({initial,metadataOnlySpatial=false,guardianPlacement=false,presentationInputs=false,recoveryOptions={},diagnostics={}}={}){
 if(!initial||typeof metadataOnlySpatial!=='boolean'||typeof guardianPlacement!=='boolean'||typeof presentationInputs!=='boolean'||!recoveryOptions||!diagnostics)throw TypeError('Invalid early worker options');
 const d=diagnostics,legacy=d.legacyPublications===true,compactViewAcks=d.viewAck===true||!legacy,maxBatchSteps=d.batchSteps??16,batchWindowSteps=d.batchWindow??(maxBatchSteps>1?2:1);
 if(!Number.isSafeInteger(maxBatchSteps)||maxBatchSteps<1||!Number.isSafeInteger(batchWindowSteps)||batchWindowSteps<1)throw TypeError('Invalid early worker batch options');
 const clientOptions={...initial,dynamicPhysics:true,authoredCenterTemplates:true,nativeAuthorityCheckpoints:true,checkpointRaidWaitsOnly:metadataOnlySpatial&&!d.pathTrace&&!d.doubleDecode,qaGuardianOrigin:!!d.guardianOrigin,guardianPlacement,qaPlantDelayMs:d.plantDelay?500:0,qaStructureDelayMs:d.structureDelay?500:0,shareSpeciesClips:!!d.sharedClips,shareSpeciesRigs:!!d.sharedRigs,shareAdmissionSource:!!d.sharedGlb,compactPhysicsPoses:!!d.activePoses,diagnostics:!!d.enabled,compactViewAcks,compactPausedAcks:!legacy||!!d.compactPaused};
 const runtimeOptions={maxBatchSteps,batchWindowSteps,...recoveryOptions,qaPresentationInputs:!!d.causalInput,presentationInputs,startupSuspended:true,mainThreadProjection:metadataOnlySpatial&&!d.doubleDecode&&!d.pathTrace,diagnostics:!!d.enabled,coalescePublications:!!d.coalesce||!legacy,foldViews:compactViewAcks&&(!!d.foldView||!legacy),backgroundViews:compactViewAcks&&!legacy&&!d.orderedViews};
 return {clientOptions,runtimeOptions};
}
