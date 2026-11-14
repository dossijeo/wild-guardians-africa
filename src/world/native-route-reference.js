// Assignment identity shared by resource data and the physical GPU clock.
// Copying the identity grants no authority to execute the assignment.
export function copyNativeRouteReference(value){
 const {actorId,assignmentSequence,routeHandle}=value??{},id=n=>Number.isSafeInteger(n)&&n>0;
 if(!id(actorId)||!id(assignmentSequence)||typeof routeHandle?.authorityEpoch!=='string'||!routeHandle.authorityEpoch||!id(routeHandle.session)||!Number.isSafeInteger(routeHandle.slot)||routeHandle.slot<0||!id(routeHandle.generation))throw TypeError('Invalid native route reference');
 return Object.freeze({actorId,assignmentSequence,routeHandle:Object.freeze({authorityEpoch:routeHandle.authorityEpoch,session:routeHandle.session,slot:routeHandle.slot,generation:routeHandle.generation})});
}
