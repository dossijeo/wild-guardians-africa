import {nativeIdleStrollStopCodec,nativeFarmArrivalStopCodec} from '../world/native-worker-route-stop-codec.js';
import {estimateRetainedBytes} from './retained-size.js';

const idleStop=Object.freeze({codec:nativeIdleStrollStopCodec,wireTemplateField:'nativeIdleStrollStopTemplate',preparedTemplateField:'preparedIdleStrollStopTemplate',bindingField:'nativeIdleStrollStopBinding'});
const farmStop=Object.freeze({codec:nativeFarmArrivalStopCodec,wireTemplateField:'nativeFarmArrivalStopTemplate',preparedTemplateField:'preparedFarmArrivalStopTemplate',bindingField:'nativeFarmArrivalStopBinding'});
// Bounded transport descriptions only; owners remain native/controller records.
export function terrainStopProtocol(kind){if(kind===12||kind===nativeIdleStrollStopCodec.referenceKind)return idleStop;if(kind===24||kind===nativeFarmArrivalStopCodec.referenceKind)return farmStop;throw TypeError('Invalid native stop proposal family');}

// Reserve the copied preview plus the final association that may arrive while
// it is retained. Numeric retiming changes values, never this bounded shape.
export function terrainStopReservation(template,effects){
 if(!template)return {bytes:effects?effects.routeEffects.rows.byteLength+effects.gateEffects.rows.byteLength:0,bindingBytes:0};
 const {codec}=terrainStopProtocol(template.kind),binding={kind:codec.attestationKind,version:1,projectionVersion:1,reference:codec.copyReference(template),preparedReference:template,projection:codec.copyProjection({version:1,routeEffects:effects.routeEffects,gateEffects:effects.gateEffects},template)};
 const bindingBytes=estimateRetainedBytes(binding);
 return {bytes:effects.routeEffects.rows.byteLength+effects.gateEffects.rows.byteLength+estimateRetainedBytes(template)+bindingBytes,bindingBytes};
}
