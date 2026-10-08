// Fixed private artifact route for the original-fine field TRAINING control.
const SOURCE='assets/be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef.glb';
const SOURCE_SHA='be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef';
const PAYLOAD_SHA='1046256f5f432fe479e62a563e5bcb38225f6e9f453c1e03e34b48cbdeab9233';
const ARMS=['original DoubleSide','fine original and fallback DoubleSide','same fine source direct field DoubleSide','same fine source grid field DoubleSide'];
const CASE={growth:1,clock:1.75,biome:'sabana',night:0,elevation:32.5,azimuth:26.25};
export function sourceFineReportPrefix(report){
 const reject=()=>{throw Error('Unexpected source-fine training report');};
 if(report.status!=='SOURCE_FINE_FIELD_TRAINING_NOT_APPROVED'||report.viewProfile!=='SOURCE_FINE_FIELD_TRAINING_V1'||report.metricPolicyVersion!==2||report.cropVisual!==true)reject();
 if(typeof report.source!=='string'||report.source.replace(/^\//,'')!==SOURCE||report.sourceField?.sourceSha256!==SOURCE_SHA||report.sourceField?.payloadSha256!==PAYLOAD_SHA||report.sourceField?.mesh!=='maiz_05_maduro')reject();
 if(!Array.isArray(report.arms)||JSON.stringify(report.arms)!==JSON.stringify(ARMS)||Object.entries(CASE).some(([k,v])=>report.prospectiveCase?.[k]!==v))reject();
 if(!Array.isArray(report.controls)||report.controls.length!==3||!Array.isArray(report.comparisons)||report.comparisons.length>3||report.comparisons.some((c,i)=>c.arm!==i+1))reject();
 if(report.cleanup?.closed!==true||!Array.isArray(report.cleanup.disposed)||!Array.isArray(report.cleanup.errors)||typeof report.contextLost!=='boolean')reject();
 // No status/metric is converted into approval. Invalid controls and failed
 // comparisons remain exportable under the same fixed NOT_APPROVED profile.
 return 'crop-source-fine-field-training';
}
