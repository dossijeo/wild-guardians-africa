// Explicit opt-in QA protocol; default campaigns retain the original proof.
// Gate selection and real purchases must continue using their original quote.
import {nativeIntegratedPerimeterProof} from './native-integrated-perimeter-proof.mjs';
import {stableProspectiveWallPlan} from './stable-prospective-wall-plan-candidate.mjs';
export function nativeStablePlanPerimeterProof(state,nav,plan,bounds,options={}){
 const prospective=stableProspectiveWallPlan(state,nav,plan);
 return nativeIntegratedPerimeterProof(state,nav,prospective,bounds,options);
}
