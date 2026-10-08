// Fixed private artifact route for the original-fine field TRAINING control.
const SOURCE='assets/be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef.glb';
const SOURCE_SHA='be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef';
const PAYLOAD_SHA='1046256f5f432fe479e62a563e5bcb38225f6e9f453c1e03e34b48cbdeab9233';
const ARMS=['original DoubleSide','fine original and fallback DoubleSide','same fine source direct field DoubleSide','same fine source grid field DoubleSide'];
const CASE={growth:1,clock:1.75,biome:'sabana',night:0,elevation:32.5,azimuth:26.25};
export function sourceFineReportPrefix(report){
 const failures=[],check=(field,actual,expected,valid=actual===expected)=>{if(!valid)failures.push({field,actual:actual??null,expected});};
 check('status',report.status,'SOURCE_FINE_FIELD_TRAINING_NOT_APPROVED');check('viewProfile',report.viewProfile,'SOURCE_FINE_FIELD_TRAINING_V1');check('metricPolicyVersion',report.metricPolicyVersion,2);check('cropVisual',report.cropVisual,true);
 check('source',report.source,SOURCE,typeof report.source==='string'&&report.source.replace(/^\//,'')===SOURCE);
 check('sourceField.sourceSha256',report.sourceField?.sourceSha256,SOURCE_SHA);check('sourceField.payloadSha256',report.sourceField?.payloadSha256,PAYLOAD_SHA);check('sourceField.mesh',report.sourceField?.mesh,'maiz_05_maduro');
 check('arms',report.arms,ARMS,Array.isArray(report.arms)&&JSON.stringify(report.arms)===JSON.stringify(ARMS));
 for(const [key,value] of Object.entries(CASE))check('prospectiveCase.'+key,report.prospectiveCase?.[key],value);
 check('controls.length',report.controls?.length,3,Array.isArray(report.controls)&&report.controls.length===3);
 check('comparisons.arms',report.comparisons?.map?.(c=>c.arm),'ordered prefix of [1,2,3]',Array.isArray(report.comparisons)&&report.comparisons.length<=3&&report.comparisons.every((c,i)=>c.arm===i+1));
 check('cleanup.closed',report.cleanup?.closed,true);check('cleanup.disposed',typeof report.cleanup?.disposed,'array',Array.isArray(report.cleanup?.disposed));check('cleanup.errors',typeof report.cleanup?.errors,'array',Array.isArray(report.cleanup?.errors));check('contextLost.type',typeof report.contextLost,'boolean');
 if(failures.length)throw Object.assign(Error('Unexpected source-fine training report: '+JSON.stringify(failures)),{validationFailures:failures});
 // No status/metric is converted into approval. Invalid controls and failed
 // comparisons remain exportable under the same fixed NOT_APPROVED profile.
 return 'crop-source-fine-field-training';
}
