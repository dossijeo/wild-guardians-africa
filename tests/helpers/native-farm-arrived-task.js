import assert from 'node:assert/strict';
import {nativeFarmMovingTaskFixture} from './native-farm-moving-task.js';

// Actual completed Farm23, without stop24, Idle or graphical permission.
export function nativeFarmArrivedTaskFixture(options={}){
 const f=nativeFarmMovingTaskFixture({...options,stop:false});try{
  const reference=f.farmBinding.reference;
  f.advance(Math.max(0,reference.endTime-f.state.elapsed)+.05);
  const source=f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);
  assert.equal(source.kind,'native-farm-arrival-route-execution');assert.equal(source.arrived,true);assert.equal(source.currentSpeed,0);assert(f.state.elapsed>=reference.endTime);
  assert.equal(f.planner.nativeFarmArrivalHeldExecution(f.actor),null);assert.equal(f.planner.nativeSuspendedGateRoute(f.actor),null);
  // Publish the already issued23 before measuring the successor's journal.
  f.planner.flushWorldEvents();f.planner.flushTaskEvents();
  return {...f,source};
 }catch(error){f.close();throw error;}
}
