// QA-only counters inserted into the authored algorithm. No replacement route,
// terrain samples, RNG calls or simulation state are added by the observer.
import assert from 'node:assert/strict';

export function diagnosticWateringSource(source){
 const replace=(needle,replacement)=>{assert.equal(source.split(needle).length,2,`Diagnostic anchor changed: ${needle}`);source=source.replace(needle,replacement);};
 replace('export function canWaterFrom(worker,plant,nav){','export function canWaterFrom(worker,plant,nav){\n  qaWatering.reachChecks++;');
 replace('if(Math.hypot(worker.x-plant.x,worker.z-plant.z)>reach)return false;','if(Math.hypot(worker.x-plant.x,worker.z-plant.z)>reach){qaWatering.distanceRejected++;return false;}');
 replace('return Math.abs(nav.workerSurface(worker.x,worker.z)-nav.field.surface(plant.x,plant.z))<=.5;','const reachable=Math.abs(nav.workerSurface(worker.x,worker.z)-nav.field.surface(plant.x,plant.z))<=.5;\n  if(!reachable)qaWatering.heightRejected++;return reachable;');
 replace('export function wateringRoute(worker,plant,nav){','export function wateringRoute(worker,plant,nav){\n  qaWatering.routes++;');
 replace('if(!canWaterFrom({...destination,radius},plant,nav))continue;','qaWatering.candidates++;\n    if(!canWaterFrom({...destination,radius},plant,nav)){qaWatering.reachRejected++;continue;}');
 replace('if(nav.walkable?.(destination.x,destination.z,radius,null,true)===false)continue;','if(nav.walkable?.(destination.x,destination.z,radius,null,true)===false){qaWatering.walkRejected++;continue;}');
 replace('const path=nav.path(worker,destination,radius,null,true);','qaWatering.pathQueries++;\n    const path=nav.path(worker,destination,radius,null,true);');
 replace('const path=nav.path(worker,destination,radius,null,true);\n    if(path)return {destination,path};\n  }\n  return null;\n}', 'const path=nav.path(worker,destination,radius,null,true);\n    if(path){qaWatering.reachable++;return {destination,path};}\n    qaWatering.pathRejected++;\n  }\n  qaWatering.unreachable++;return null;\n}');
 // Require exact unique anchors rather than silently instrumenting repairRoute.
 return source+'\nexport const qaWatering={reachChecks:0,distanceRejected:0,heightRejected:0,routes:0,candidates:0,reachRejected:0,walkRejected:0,pathQueries:0,pathRejected:0,reachable:0,unreachable:0};\n';
}
