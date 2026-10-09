// Shared by preflight and the actual POST, before experiment-specific validation.
export function nativeReportStatus(report){
 const sourceFine=report?.status==='SOURCE_FINE_FIELD_TRAINING_NOT_APPROVED';
 const accepted=['SELECTION_ONLY_NOT_APPROVED','VISUAL_SCREEN_NOT_APPROVED','GPU_CANDIDATE_EXPERIMENT_NOT_APPROVED','WORLD_MAIZE_QA_NOT_APPROVED','WORLD_DENSE_MAIZE_GPU_NOT_APPROVED','WORLD_DENSE_YOUNG_MAIZE_GPU_NOT_APPROVED'];
 if(!sourceFine&&!accepted.includes(report?.status))throw Error('Unexpected report status: '+String(report?.status));
 if(report.status==='WORLD_DENSE_YOUNG_MAIZE_GPU_NOT_APPROVED'&&report.denseWorldYoungMaizeQa!==true)throw Error('Young World report identity missing');
 if(report.status==='GPU_CANDIDATE_EXPERIMENT_NOT_APPROVED'&&report.sharedLeafGpuNet!==true)throw Error('GPU report identity missing');
 return sourceFine;
}
