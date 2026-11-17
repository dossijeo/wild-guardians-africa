import {copyNativeIdleStrollStopReference,copyNativeIdleStrollStopProjection} from '../world/native-idle-stroll-stop.js';
import {estimateRetainedBytes} from './retained-size.js';

// Reserve the copied preview plus the final association that may arrive while
// it is retained. Numeric retiming changes values, never this bounded shape.
export function terrainStopReservation(template,effects){
 if(!template)return {bytes:effects?effects.routeEffects.rows.byteLength+effects.gateEffects.rows.byteLength:0,bindingBytes:0};
 const binding={kind:'native-idle-stroll-stop-attestation',version:1,projectionVersion:1,reference:copyNativeIdleStrollStopReference(template),preparedReference:template,projection:copyNativeIdleStrollStopProjection({version:1,routeEffects:effects.routeEffects,gateEffects:effects.gateEffects},template)};
 const bindingBytes=estimateRetainedBytes(binding);
 return {bytes:effects.routeEffects.rows.byteLength+effects.gateEffects.rows.byteLength+estimateRetainedBytes(template)+bindingBytes,bindingBytes};
}
