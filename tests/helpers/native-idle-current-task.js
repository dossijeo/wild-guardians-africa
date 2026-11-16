import assert from 'node:assert/strict';
import {acquireNativeIdleArrivalStroll} from './native-idle-arrival.js';
import {createPlant} from '../../src/simulation/crops.js';
import {emit} from '../../src/simulation/game.js';
import {enqueue} from '../../src/simulation/tasks.js';

// Source/public Game APIs, without a rendering double or a manually assigned task.
export function requestNativeIdleCurrentTask(f,state=f.state){
 const p=f.point(6,0),target=createPlant(`plant-${state.nextId++}`,'mijo',p.x,p.z,f.worker.centerId);target.growth=999999;target.harvestRequested=true;state.plants.push(target);emit(state,'CropPlaced',{targetId:target.id});enqueue(state,f.worker.centerId,'harvest',target.id);f.planner.flushWorldEvents();f.planner.flushTaskEvents();const plan=f.planner.planIfNeeded(state.elapsed);assert.equal(plan.filter(p=>p.status===1).length,1);assert.equal(f.planner.commitTaskBatchToState(state,plan,{navVersion:1,pendingResources:true}),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');return f.planner.pendingTaskRoute(f.worker.id);
}
export function nativeIdleCurrentTaskPolicy(f){return {bodyId:1,radius:.28,urgent:false,runRemaining:f.worker.runRemaining,runPhase:f.worker.runPhase,walkPhase:f.worker.walkPhase,carryPhase:f.worker.carryPhase};}
// Connect both existing channels before moving22, then acquire actual REST21.
export function acquireNativeIdleCurrentTask(source){
 const f=acquireNativeIdleArrivalStroll(source);try{f.arrive();const p=f.prepareRest(),idleLease=f.c.admitIdleCycle(p.nativeIdleCycle,{preparingWorldBoundary:p.worldBoundary}),idleBinding=f.commitRest(p);return {...f,idleLease,idleBinding,requestTask:()=>requestNativeIdleCurrentTask(f)};}catch(error){f.close();throw error;}
}
