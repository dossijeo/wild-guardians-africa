import {villageCost} from './rules.js';
import {villageLayout} from '../world/villages.js';

// Only facts used for provisional presentation. Placement, collision,
// affordability and the final result remain exclusively authoritative.
export function projectConfirmedConstruction(state){
 if(!state||typeof state.culture!=='string'||!state.culture||!Array.isArray(state.villages)||state.hiringPaidDay!==null&&!Number.isSafeInteger(state.hiringPaidDay))throw TypeError('Invalid construction state');
 const villages=state.villages.map(village=>{if(!village||typeof village.culture!=='string'||!village.culture||![village.x,village.z].every(Number.isFinite))throw TypeError('Invalid confirmed village');return {culture:village.culture,x:village.x,z:village.z};});
 return {culture:state.culture,hiringPaidDay:state.hiringPaidDay,villages};
}

export function validateConfirmedConstruction(value){
 if(!value||typeof value!=='object'||Array.isArray(value)||Object.keys(value).sort().join(',')!=='culture,hiringPaidDay,villages'||!Array.isArray(value.villages)||value.villages.some(village=>!village||typeof village!=='object'||Array.isArray(village)||Object.keys(village).sort().join(',')!=='culture,x,z'))throw TypeError('Invalid construction projection');
 return projectConfirmedConstruction(value);
}

export function provisionalCenterCulture(view,x,z){
 if(![x,z].every(Number.isFinite))throw TypeError('Invalid center position');const facts=validateConfirmedConstruction(view),nearest=facts.villages.reduce((best,village)=>!best||Math.hypot(village.x-x,village.z-z)<Math.hypot(best.x-x,best.z-z)?village:best,null);return nearest?.culture??facts.culture;
}

export function pendingVillagePreview(view,culture,x,z,payload){
 const facts=validateConfirmedConstruction(view);if(typeof culture!=='string'||!culture||![x,z].every(Number.isFinite)||!payload||!Array.isArray(payload.units))throw TypeError('Invalid provisional village');
 return {culture,x,z,buildings:villageLayout(payload,x,z),cost:villageCost(facts.villages.length+1),valid:false,pending:true};
}
