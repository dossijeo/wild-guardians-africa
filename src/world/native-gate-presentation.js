import {copyNativeRouteReference} from './native-route-reference.js';

export function sameNativeGatePresentations(a,b){
 return Array.isArray(a)&&Array.isArray(b)&&a.length===b.length&&a.every((gate,i)=>{
  const other=b[i];return other&&['gateId','entityId','mechanism','modelId','startTime','endTime'].every(key=>gate[key]===other[key])&&['rootMatrix','hinge','positions','leafFlags','rows'].every(key=>gate[key].length===other[key]?.length&&gate[key].every((value,index)=>Object.is(value,other[key][index])));
 });
}

// The existing native motor supplies every affine opening interval. This is a
// copied graphical resource, never permission to open a gate or execute a route.
export function copyNativeGatePresentation(value,{nativeRoute,startTime,endTime}={}){
 const id=n=>Number.isSafeInteger(n)&&n>0,ref=copyNativeRouteReference(value?.nativeRoute);
 if(value?.kind!=='native-gate-presentation'||value.version!==1||value.authorizedAutonomy!==false||!id(value.gateId)||value.entityId!==`structure-${value.gateId}`||!id(value.mechanism)||![1,2,3].includes(value.modelId)||JSON.stringify(ref)!==JSON.stringify(copyNativeRouteReference(nativeRoute))||value.startTime!==startTime||value.endTime!==endTime||!Number.isFinite(startTime)||startTime<0||!Number.isFinite(endTime)||endTime<startTime||value.rootMatrix?.length!==16||!Array.from(value.rootMatrix).every(Number.isFinite)||value.hinge?.length!==3||!Array.from(value.hinge).every(Number.isFinite)||!(value.positions instanceof Float32Array)||value.positions.length<9||value.positions.length%9!==0||value.positions.length>300000||!value.positions.every(Number.isFinite)||!(value.leafFlags instanceof Uint8Array)||value.leafFlags.length*3!==value.positions.length||!value.leafFlags.every(flag=>flag===0||flag===1)||!(value.rows instanceof Float64Array)||value.rows.length<2||value.rows.length%2!==0||value.rows.length>12||value.rows[0]!==startTime||value.rows.at(-2)!==endTime)throw TypeError('Invalid native gate presentation');
 const m=value.rootMatrix;
 if(m[3]!==0||m[7]!==0||m[11]!==0||m[15]!==1||m[4]!==0||m[6]!==0||m[1]!==0||m[9]!==0||m[5]<=0||m[0]*m[10]-m[8]*m[2]<=0||value.hinge[1]!==0)throw TypeError('Invalid native gate root or hinge');
 for(let i=0;i<value.rows.length;i+=2)if(!Number.isFinite(value.rows[i])||i>0&&value.rows[i]<=value.rows[i-2]||!Number.isFinite(value.rows[i+1])||value.rows[i+1]<0||value.rows[i+1]>1)throw TypeError('Invalid native gate opening interval');
 for(let i=0;i<value.leafFlags.length;i+=3)if(value.leafFlags[i]!==value.leafFlags[i+1]||value.leafFlags[i]!==value.leafFlags[i+2])throw TypeError('Invalid native gate triangle partition');
 return Object.freeze({kind:value.kind,version:1,nativeRoute:ref,gateId:value.gateId,entityId:value.entityId,mechanism:value.mechanism,modelId:value.modelId,startTime,endTime,rootMatrix:Object.freeze(Array.from(m)),hinge:Object.freeze(Array.from(value.hinge)),positions:value.positions.slice(),leafFlags:value.leafFlags.slice(),rows:value.rows.slice(),authorizedAutonomy:false});
}
