// Shared report construction for the real fixture and CPU export preflight.
// Construction supplies identity, never a visual pass or an approval.
import {sourceFineMapping} from './frontside-source-fine-report.mjs';
export function createSourceFineReport({source,mappingRecord,metadata,sample,cpuCampaigns,contextAttributes}){
 const sourceMapping=sourceFineMapping(mappingRecord);
 if(![sourceMapping.source,sourceMapping.runtime].includes(source?.replace(/^\//,'')))throw Error('Observed manifest URL does not match source-fine mapping');
 for(const key of ['source','runtime','sourceSha256','runtimeSha256'])if(metadata?.[key]!==sourceMapping[key])throw Error('Field metadata mismatch: '+key);
 return{status:'SOURCE_FINE_FIELD_TRAINING_NOT_APPROVED',cropVisual:true,metricPolicyVersion:2,source,sourceOriginal:sourceMapping.source,runtimeSource:sourceMapping.runtime,sourceMapping,sourceField:metadata,viewProfile:'SOURCE_FINE_FIELD_TRAINING_V1',arms:['original DoubleSide','fine original and fallback DoubleSide','same fine source direct field DoubleSide','same fine source grid field DoubleSide'],prospectiveCase:sample,campaignConditions:{cpuCampaigns:cpuCampaigns??'unspecified',gpuTiming:false},contextAttributes,controls:[],comparisons:[],drawInfo:[],limitations:['No coarse proxy or FrontSide rendered.','Only one existing TRAINING view; no independent, growth/bridge, shadowFront, resource or net GPU approval.','Original view-position derivatives are valid only for fine geometry. No coarse field derivative recipe is implemented.']};
}
