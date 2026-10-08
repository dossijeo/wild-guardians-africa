import {sourceFineIdentity} from './frontside-source-fine-report.mjs';
import {sharedLeafReviewCases} from './frontside-shared-leaf-review-cases.mjs';
export function sharedLeafReportPrefix(report){
 const failures=[],check=(field,actual,expected)=>{if(actual!==expected)failures.push({field,actual:actual??null,expected});};
 check('status',report.status,'VISUAL_SCREEN_NOT_APPROVED');check('sharedLeafReverseHuman',report.sharedLeafReverseHuman,true);check('viewProfile',report.viewProfile,'SHARED_LEAF_HUMAN_REVIEW_V3');check('visualAcceptancePolicyVersion',report.visualAcceptancePolicyVersion,3);check('visualReview.status',report.visualReview?.status,'HUMAN_REVIEW_PENDING');check('metricPolicyVersion',report.metricPolicyVersion,2);
 check('source',report.source?.replace(/^\//,''),sourceFineIdentity.runtime);check('sourceOriginal',report.sourceOriginal,sourceFineIdentity.source);check('runtimeSource',report.runtimeSource,sourceFineIdentity.runtime);for(const [key,value] of Object.entries(sourceFineIdentity))check('sourceMapping.'+key,report.sourceMapping?.[key],value);
 check('archiveSha256',report.archiveSha256,'4d6d5dd729211e9ed5e429915ec81960da5e6b2197d1c8982a3dbb6a92893065');
 const index=report.viewCaseIndex??0,view=sharedLeafReviewCases[index];check('viewCaseIndex.valid',Number.isInteger(index)&&!!view,true);
 if(view){check('viewCaseId',report.viewCaseId??'training-mature',view.id);for(const key of ['growth','clock','biome','night','elevation','azimuth'])check('prospectiveCase.'+key,report.prospectiveCase?.[key],view[key]);}
 check('arms.length',report.arms?.length,4);check('controls.length',report.controls?.length,3);check('comparisons.ordered',Array.isArray(report.comparisons)&&report.comparisons.length===3&&report.comparisons.every((c,i)=>c.arm===i+1),true);check('cleanup.closed',report.cleanup?.closed,true);check('contextLost.type',typeof report.contextLost,'boolean');
 if(failures.length)throw Object.assign(Error('Unexpected shared-leaf human report: '+JSON.stringify(failures)),{validationFailures:failures});
 return 'crop-leaf-shared-human';
}
