// QA-only display projection. Full diagnostics stay owned by the fixture and
// are exported on demand; never serialize all earlier routes every 500 ms.
function auditSummary(audit){
 if(!audit)return audit;
 const {drops,nonOffscreenDrops,omissions,...counts}=audit;
 return {...counts,detailedDropCount:drops?.length??0,nonOffscreenDropCount:nonOffscreenDrops?.length??0,omissionCount:omissions?.length??0};
}
function motionSummary(motion){
 if(!motion)return motion;
 const {snapshot,audit,allNear,selectedSpeciesNear,transitionReadinessDrops,densitySamples,...rest}=motion;
 return {...rest,allNear:auditSummary(allNear),selectedSpeciesNear:auditSummary(selectedSpeciesNear),transitionReadinessDropCount:transitionReadinessDrops?.length??0,densitySampleCount:densitySamples?.length??0};
}
function submissionSummary(submission){
 if(!submission)return submission;
 const {draws,breakdown,...rest}=submission;
 return {...rest,drawCount:draws?.length??0,totals:breakdown?.totals,rows:breakdown?.rows};
}
function benchmarkSummary(benchmark){
 return benchmark?{...benchmark,lots:benchmark.lots.map(({submissionState,drawContext,...lot})=>({...lot,submissionState:submissionSummary(submissionState)}))}:benchmark;
}
export function compactFarReport(report){
 return {...report,submissionState:submissionSummary(report.submissionState),benchmark:benchmarkSummary(report.benchmark),standbyUpload:report.standbyUpload?{...report.standbyUpload,draws:report.standbyUpload.draws.map(({rows,...draw})=>({...draw,rowCount:rows.length}))}:report.standbyUpload,diagnostics:'Full traces: Exportar diagnóstico completo',motion:motionSummary(report.motion),sequence:report.sequence?{...report.sequence,results:report.sequence.results.map(row=>({...row,motion:motionSummary(row.motion)}))}:report.sequence};
}
