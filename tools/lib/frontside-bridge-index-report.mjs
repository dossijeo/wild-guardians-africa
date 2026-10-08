import {bridgeIndexReviewCases} from './frontside-bridge-index-review-cases.mjs';
const sourceSha='be4bb7e7eab2149516c1ecc0c364d77c4a62f116c4847cf0ef6f3308dc6180ef',runtimeSha='617568fc66595c635739ff83bc0256535a72fdf7bfcb016dc68a7f7f1e1a8a52',bridgeSha='88c4bdb959b1debb7456e6c1708840330b459a6ede6649e8f690583953428309';
export function bridgeIndexReportPrefix(report,{preflight=false}={}){
 const fail=message=>{const error=Error('Unexpected original bridge indexed Double report: '+message);error.validationFailures=[message];throw error;};
 if(report.status!=='VISUAL_SCREEN_NOT_APPROVED'||report.originalBridgeIndexHuman!==true||report.cropVisual!==true||report.viewProfile!=='ORIGINAL_BRIDGE_INDEX_DOUBLE_REVIEW_V1')fail('profile');
 if(report.preflightOnly===true&&!preflight)fail('preflight placeholder is not a native report');
 if(report.visualAcceptancePolicyVersion!==3||report.visualReview?.status!=='HUMAN_REVIEW_PENDING'||report.visualReview.reviewer!==null||report.visualReview.decision!==null)fail('pending perceptual review');
 if(report.sourceSha256!==sourceSha||report.runtimeSha256!==runtimeSha||report.bridgeSha256!==bridgeSha)fail('source hashes');
 if(report.sourceOriginal!==`assets/${sourceSha}.glb`||report.runtimeSource!==`assets/web/${sourceSha}.glb`||report.source?.replace(/^\//,'')!==report.runtimeSource)fail('original/runtime mapping');
 const sample=bridgeIndexReviewCases[report.viewCaseIndex];if(!sample||JSON.stringify(report.prospectiveCase)!==JSON.stringify(sample))fail('prospective source case');
 if(JSON.stringify(report.arms)!==JSON.stringify(['native original nonindexed DoubleSide','same original indexed DoubleSide'])||report.phase?.phase!=='morph')fail('DoubleSide morph arms');
 if(report.runtime?.control?.mesh!=='puente_maiz_3_4'||report.runtime.control.closed||!report.runtime.control.liveBridgeShared||!report.runtime.control.instanceMatrixShared||!report.runtime.control.materialUnchanged||!report.runtime.control.shadowUnchanged)fail('native instance/material ownership');
 if(report.runtime.arms?.length!==2||report.runtime.arms.some(a=>a.materialSide!==2||a.shadowSide!==2||!a.visible||a.count!==1))fail('active DoubleSide bridge');
 if(report.runtime.control.indexCount!==report.runtime.control.sourceCorners)fail('source triangle stream length');
 if(report.campaignConditions?.gpuTiming!==false)fail('unexpected timing');
 if(report.cleanup?.closed!==true||report.cleanup.contextLost!==true||report.cleanup.errors?.length!==0||report.errors?.length!==0)fail('cleanup/errors');
 // No pixel/silhouette threshold is used as an acceptance or transport gate.
 return 'crop-bridge-index-double';
}
