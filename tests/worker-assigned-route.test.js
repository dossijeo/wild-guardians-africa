import test from 'node:test';
import assert from 'node:assert/strict';
import {beginAssignedWorkerRouteStep,assignedWorkerRouteStep,candidateTaskRouteStep} from '../src/simulation/worker-assigned-route.js';

function navigation(yields){
 const nav={version:1,obstacles:[],searches:0,steps:0,
  walkable(){return false;},segmentClear(){return false;},
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

test('candidate route exhaustion is pending until the iterator proves reachability',()=>{
 const nav=navigation(45),worker={id:'w',x:0,z:0},task={id:'t',kind:'harvest'},target={id:'crop',x:2,z:0};
 beginAssignedWorkerRouteStep(nav);
 assert.deepEqual(candidateTaskRouteStep(nav,worker,task,target),{pending:true,route:null});
 assert.equal(nav.steps,40);
 beginAssignedWorkerRouteStep(nav);
 assert.deepEqual(candidateTaskRouteStep(nav,worker,task,target),{pending:false,route:{destination:target,path:[{x:2,z:0}]}});
 assert.equal(nav.searches,1);
});

test('a completed failed route is distinct from a still pending search',()=>{
 const nav=navigation(0);nav.findPathSteps=function*(){yield null;return null;};
 const worker={id:'w',x:0,z:0},task={id:'t',kind:'harvest'},target={id:'crop',x:2,z:0};
 beginAssignedWorkerRouteStep(nav);
 assert.deepEqual(candidateTaskRouteStep(nav,worker,task,target),{pending:false,route:null});
});

test('direct candidate route remains available after the incremental search budget is consumed',()=>{
 const nav=navigation(100),worker={id:'w',x:0,z:0},task={id:'t',kind:'harvest'},target={id:'crop',x:2,z:0};
 beginAssignedWorkerRouteStep(nav);
 assert.equal(candidateTaskRouteStep(nav,worker,task,target).pending,true);
 const other={id:'other',x:3,z:0};
 nav.walkable=()=>true;nav.segmentClear=()=>true;
 assert.deepEqual(candidateTaskRouteStep(nav,worker,{id:'next',kind:'harvest'},other),{pending:false,route:{destination:other,path:[{x:3,z:0}]}});
 assert.equal(nav.searches,1);
});
