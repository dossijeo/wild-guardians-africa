import {nativeIntegratedPerimeterProof} from './native-integrated-perimeter-proof.mjs';

// Completion requires every proposed piece/update to have been committed.
// This is not the predictive proof used to choose an unpaid construction plan.
export function nativePaidContourProof(state,nav,plan,bounds,options){
 if(plan.pieces.length||plan.updates.length)return {
  valid:false,reason:'incomplete-paid-native-contour',checks:[],deferred:true,
  scope:'Paid completion not eligible: native quote still contains proposed geometry.'
 };
 return nativeIntegratedPerimeterProof(state,nav,plan,bounds,options);
}
