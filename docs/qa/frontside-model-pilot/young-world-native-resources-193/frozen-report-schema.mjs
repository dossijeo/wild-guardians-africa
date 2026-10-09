// Specific transport contract, not a visual or GPU benefit decision.
export function denseWorldYoungMaizeReportPrefix(report,{preflight=false}={}){
 const failures=[],check=(field,actual,expected)=>{if(actual!==expected)failures.push({field,actual:actual??null,expected});};
 for(const [field,value] of Object.entries({status:'WORLD_DENSE_YOUNG_MAIZE_GPU_NOT_APPROVED',denseWorldYoungMaizeQa:true,visualAcceptancePolicyVersion:3,viewProfile:'DECLARED_DENSE_NATIVE_WORLD_YOUNG_MAIZE_V1',candidatePayloadSha256:'d4796b80770b472ace76372cbb12f75138a294eed8daa0ed8085606f8b2d8335',candidatePayloadBytes:537019,candidatePayloadFormat:'BLENDER_JSON',candidateMesh:'maiz_02_joven',sourceSha256:'be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef',quality:'media'}))check(field,report[field],value);
 check('campaign.valid',['review','timing','resources'].includes(report.campaign),true);check('qaDepth.valid',['off','front'].includes(report.qaDepth),true);check('vfx.valid',['off','on'].includes(report.vfx),true);
 for(const field of ['sourceStateSha256','workloadStateSha256'])check(field+'.valid',/^[a-f0-9]{64}$/.test(report[field]??''),true);
 check('resolution',JSON.stringify(report.resolution),'[1280,720]');check('scenario.profile',report.scenario?.profile,'ARCHIVED_POSITIONS_DENSE_NATIVE_YOUNG_MAIZE_QA_V1');check('scenario.artificialWorkload',report.scenario?.artificialWorkload,true);check('scenario.count.valid',Number.isInteger(report.scenario?.youngMaizeCount)&&report.scenario.youngMaizeCount>0,true);
 check('scenario.normalizedGrowth',report.scenario?.normalizedGrowth,.31);check('scenario.nativeDurationSeconds',report.scenario?.nativeDurationSeconds,270);if(report.campaign==='timing')check('qaDepth.timing',report.qaDepth,'front');
 check('visualReview.status',report.visualReview?.status,'HUMAN_REVIEW_PENDING');check('visualReview.reviewer',report.visualReview?.reviewer,null);check('visualReview.decision',report.visualReview?.decision,null);
 check('conditions.gpuTiming',report.conditions?.gpuTiming,report.campaign==='timing');check('conditions.bufferReadback',report.conditions?.bufferReadback,report.campaign==='bindings');check('cleanup.closed',report.cleanup?.closed,true);check('cleanup.contextLost',report.cleanup?.contextLost,true);check('cleanup.errors.array',Array.isArray(report.cleanup?.errors),true);check('errors.array',Array.isArray(report.errors),true);
 // Preserve incomplete or negative timing reports; analysis cannot approve models.
 check('campaign.output',report.campaign==='bindings'?Array.isArray(report.liveGrowthBindings?.rows):report.campaign==='timing'?Array.isArray(report.timing?.blocks):Array.isArray(report.arms),true);
 if(report.preflightOnly===true&&!preflight)failures.push({field:'preflightOnly',actual:true,expected:false});
 if(failures.length)throw Object.assign(Error('Unexpected dense World maize report: '+JSON.stringify(failures)),{validationFailures:failures});
 return 'maize-young-world-dense-'+report.campaign+'-depth-'+report.qaDepth+'-vfx-'+report.vfx;
}
