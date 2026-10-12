import test from 'node:test';
import assert from 'node:assert/strict';
import {beginAssignedWorkerRouteStep,assignedWorkerRouteStep} from '../src/simulation/worker-assigned-route.js';

function navigation(yields){
 const nav={version:1,obstacles:[],searches:0,steps:0,
  *findPathSteps(start,end){
   this.searches++;
   for(let i=0;i<yields;i++){this.steps++;yield null;}
   return [{x:end.x,z:end.z}];
  },
  smoothPath(_start,path){return path;},
 };
 return nav;
}

test('assigned worker retains a pending route across simulation steps and restarts on geometry change',()=>{
 const nav=navigation(9),worker={id:'w',taskId:'t',x:0,z:0},end={id:'crop',x:2,z:0};
 beginAssignedWorkerRouteStep(nav);
 assert.equal(assignedWorkerRouteStep(nav,worker,end,.28).pending,true);
 assert.equal(assignedWorkerRouteStep(nav,worker,end,.28).pending,true);
 nav.version++;
 beginAssignedWorkerRouteStep(nav);
 assert.equal(assignedWorkerRouteStep(nav,worker,end,.28).pending,true);
 assert.equal(nav.searches,2);
 beginAssignedWorkerRouteStep(nav);
 assert.equal(assignedWorkerRouteStep(nav,worker,end,.28).pending,true);
 beginAssignedWorkerRouteStep(nav);
 assert.deepEqual(assignedWorkerRouteStep(nav,worker,end,.28),{pending:false,path:[{x:2,z:0}]});
});
