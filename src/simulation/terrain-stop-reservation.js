import {nativeIdleStrollStopCodec,nativeFarmArrivalStopCodec,nativeTaskRouteStopCodec} from '../world/native-worker-route-stop-codec.js';
import {estimateRetainedBytes} from './retained-size.js';

const idleStop=Object.freeze({codec:nativeIdleStrollStopCodec,wireTemplateField:'nativeIdleStrollStopTemplate',preparedTemplateField:'preparedIdleStrollStopTemplate',bindingField:'nativeIdleStrollStopBinding'});
const farmStop=Object.freeze({codec:nativeFarmArrivalStopCodec,wireTemplateField:'nativeFarmArrivalStopTemplate',preparedTemplateField:'preparedFarmArrivalStopTemplate',bindingField:'nativeFarmArrivalStopBinding'});
const taskStop=Object.freeze({codec:nativeTaskRouteStopCodec,wireTemplateField:'nativeTaskRouteStopTemplate',preparedTemplateField:'preparedTaskRouteStopTemplate',bindingField:'nativeTaskRouteStopBinding'});
const stops=[idleStop,farmStop,taskStop];
// Bounded transport descriptions only; owners remain native/controller records.
export function terrainStopProtocol(kind){
 const stop=stops.find(({codec})=>kind===codec.kind||kind===codec.referenceKind);
 if(!stop)throw TypeError('Invalid native stop proposal family');
 return stop;
}
export const isTerrainStopKind=kind=>stops.some(({codec})=>codec.kind===kind);
export function terrainStopProposalProtocol(resources){
 if(resources?.nativeStop===undefined)return resources?.kind===24||resources?.kind===25?terrainStopProtocol(resources.kind):null;
 const stop=terrainStopProtocol(resources.kind);
 if(resources.nativeStop?.kind!==stop.codec.referenceKind)throw TypeError('Invalid native stop proposal family');
 return stop;
}
export const hasOtherTerrainStopField=(value,field,current=null)=>stops.some(stop=>stop!==current&&value?.[stop[field]]!==undefined);
export function terrainStopWireProtocol(value,conflictMessage='Conflicting native terrain stop templates'){
 const stop=stops.find(item=>value[item.wireTemplateField]!==undefined)??null;
 if(hasOtherTerrainStopField(value,'wireTemplateField',stop))throw Error(conflictMessage);
 return stop;
}

// Reserve the copied preview plus the final association that may arrive while
// it is retained. Numeric retiming changes values, never this bounded shape.
export function terrainStopReservation(template,effects){
 if(!template)return {bytes:effects?effects.routeEffects.rows.byteLength+effects.gateEffects.rows.byteLength:0,bindingBytes:0};
 const {codec}=terrainStopProtocol(template.kind),binding={kind:codec.attestationKind,version:1,projectionVersion:1,reference:codec.copyReference(template),preparedReference:template,projection:codec.copyProjection({version:1,routeEffects:effects.routeEffects,gateEffects:effects.gateEffects},template)};
 const bindingBytes=estimateRetainedBytes(binding);
 return {bytes:effects.routeEffects.rows.byteLength+effects.gateEffects.rows.byteLength+estimateRetainedBytes(template)+bindingBytes,bindingBytes};
}
