import {copyNativeRouteReference} from './native-route-reference.js';
import {copyNativeWorldBoundary} from './native-world-boundary.js';

// A copied resource description, not permission to execute or replay a route.
// The authority supplies every knot and sample from its existing native owner.
export const NATIVE_ROUTE_PRESENTATION_VERSION=1;
export const NATIVE_ROUTE_PRESENTATION_FIELDS=Object.freeze([
 'at','x','z','distance','phase','yaw','firstRemainingPoint','arrived',
 'runPhase','walkPhase','carryPhase','runDistance','walkDistance',
 'runRemaining','running','currentSpeed'
]);
export const NATIVE_ROUTE_PRESENTATION_WIDTH=NATIVE_ROUTE_PRESENTATION_FIELDS.length;

// Continuous values interpolate between native knots. Categorical values use
// the native interval's right-hand state; the terminal row is its exact state.
export const NATIVE_ROUTE_PRESENTATION_CONTINUOUS=Object.freeze([1,2,3,4,8,9,10,11,12,13]);

// Validate at preparation/transfer boundaries, never by sampling a route every
// frame. A failed resource is rejected whole; the complete native path is never
// truncated to a renderer's historical segment capacity.
export function copyNativeRoutePresentation(value){
 const width=NATIVE_ROUTE_PRESENTATION_WIDTH,rows=value?.rows,motionFlags=value?.motionFlags===undefined?0:value.motionFlags;
 if(!Number.isInteger(motionFlags)||motionFlags<0||motionFlags>63||value?.motionMode==='animal'&&motionFlags!==0)throw TypeError('Invalid native presentation motion flags');
 if(value?.kind!=='native-route-presentation'||value.version!==NATIVE_ROUTE_PRESENTATION_VERSION||value.rowWidth!==width||value.authorizedAutonomy!==false||!(rows instanceof Float64Array)||rows.length<width||rows.length%width!==0||rows.length/width>16384||!['worker','animal'].includes(value.motionMode)||!Number.isSafeInteger(value.profile)||value.profile<0||!Number.isFinite(value.radius)||value.radius<=0||typeof value.executionScope!=='string'||!value.executionScope||typeof value.nativeCrossingAdmitted!=='boolean'||!Number.isFinite(value.startTime)||value.startTime<0||!Number.isFinite(value.endTime)||value.endTime<value.startTime||rows[0]!==value.startTime||rows.at(-width)!==value.endTime)throw TypeError('Invalid native route presentation');
 const nativeRoute=copyNativeRouteReference(value.nativeRoute),worldBoundary=copyNativeWorldBoundary(value.worldBoundary);
 if(worldBoundary&&(worldBoundary.authorityEpoch!==nativeRoute.routeHandle.authorityEpoch||worldBoundary.nativeSession!==nativeRoute.routeHandle.session))throw TypeError('Native presentation belongs to another world');
 for(let i=0;i<rows.length;i+=width){
  for(let column=0;column<width;column++)if(!Number.isFinite(rows[i+column]))throw TypeError('Invalid native presentation sample');
  if(i>0&&rows[i]<=rows[i-width]||!Number.isSafeInteger(rows[i+6])||rows[i+6]<0||![0,1].includes(rows[i+7])||![0,1].includes(rows[i+14])||rows[i+15]<0)throw TypeError('Invalid native presentation interval');
 }
 return Object.freeze({kind:value.kind,version:value.version,rowWidth:width,nativeRoute,worldBoundary,startTime:value.startTime,endTime:value.endTime,motionMode:value.motionMode,motionFlags,profile:value.profile,radius:value.radius,executionScope:value.executionScope,nativeCrossingAdmitted:value.nativeCrossingAdmitted,authorizedAutonomy:false,rows:rows.slice()});
}
