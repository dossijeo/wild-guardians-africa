import {createSpatialDynamicBodies} from './spatial-dynamic-bodies.js';
import {createDynamicBodyProjection} from './spatial-dynamic-projection.js';
// Explicit opt-in for testing: production activation requires full movement
// parity and session lifecycle validation, not only a compatible WASM ABI.
export function attachDynamicBodyReview(nav,session){
 if(nav.dynamicBodies)throw Error('Dynamic body projection already attached');
 const service=createSpatialDynamicBodies(session.core.wasm),projection=createDynamicBodyProjection(service);
 nav.dynamicBodies=projection;
 nav.dynamicBodyReview=service;
 let disposed=false;
 return {service,dispose(){if(disposed)return;disposed=true;if(nav.dynamicBodies===projection)delete nav.dynamicBodies;if(nav.dynamicBodyReview===service)delete nav.dynamicBodyReview;projection.clear();service.dispose();}};
}
