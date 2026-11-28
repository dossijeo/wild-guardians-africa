import test from 'node:test';import assert from 'node:assert/strict';
import {createNativeIntentProduction} from '../src/simulation/native-intent-production.js';
test('blocked ruins are source-scoped, do not retry alternately, and do not starve another source',async()=>{
 const state={workers:[1,2].map(id=>({id:`worker-${id}`,nativeRouteAdmission:'native-action',taskId:`task-${id}`})),structures:[1,2].map(id=>({id:`structure-${id}`,kind:'wall',gate:false,status:'ruined',hp:0}))};
 const source=id=>({reference:{request:{actionKind:'repair',targetId:Number(id.split('-')[1])}}}),calls=[];let revision=0;
 const producer=createNativeIntentProduction({state,bodyId:()=>1,terrainManifest:()=>({}),getPublication:()=>({status:()=>({coherent:true,closed:false})}),getResources:()=>({status:()=>({phase:'running'})}),publicationSequence:()=>1,
  planner:{nativeTaskActionExecution:id=>({completed:true,binding:source(id)}),nativeTaskActionBinding:source,nativeInitialIdleRequestReference:id=>({actorId:id}),startNativeInitialIdleBodyAfterGpuQuiescence:async({actorId})=>{calls.push(actorId);return {status:'blocked'};}},
  restoreRuinedWall:async({actorId})=>{calls.push(actorId);return {status:'blocked'};},ruinedWallWakeKey:id=>id+':'+revision});
 try{for(let i=0;i<20;i++)await producer.wake();assert.deepEqual(calls,['worker-1','worker-2']);
  state.workers.push({id:'worker-3',nativeRouteAdmission:'pending-idle-resources'});await producer.wake();assert.equal(calls.at(-1),'worker-3');state.workers.pop();
  revision++;await producer.wake();await producer.wake();assert.deepEqual(calls.slice(-2),['worker-1','worker-2']);for(let i=0;i<10;i++)await producer.wake();assert.equal(calls.length,5);
 }finally{producer.dispose();}
});
