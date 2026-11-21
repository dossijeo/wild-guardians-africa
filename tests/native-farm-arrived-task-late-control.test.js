import test from 'node:test';
import assert from 'node:assert/strict';
import {controlledNativeFarmArrival} from './helpers/native-farm-arrival-control.js';
import {requestNativeIdleCurrentTask} from './helpers/native-idle-current-task.js';

test('a terminal Farm lease prepared before a late acquisition retains the actual native endpoint through Task6',()=>{
 const f=controlledNativeFarmArrival({peer:true});try{
  const p=f.prepare(true),lease=f.c.admitFarmArrival(p.nativeFarmArrival,{preparingWorldBoundary:p.worldBoundary});
  f.advance(.2);const translated=f.planner.revalidateNativeFarmArrivalRouteProposal(p.ticket);assert.equal(translated.status,'revalidated');assert(translated.timeTranslation.sameFloat32Motion);
  const binding=f.commit(p);assert.notEqual(binding.reference.endTime,p.nativeFarmArrival.endTime);
  assert.equal(f.c.installFarmArrivals(binding.reference.worldBoundary,[binding]),1);assert(lease.isCurrent());
  f.advance(binding.reference.endTime-f.state.elapsed+.05);const source=f.planner.projectNativeFarmArrivalExecution(f.state,f.worker);assert(source.arrived);f.planner.projectNativeTaskExecution(f.state,f.state.workers[1]);
  const record=lease.routeRecord,body=f.body(1),request=requestNativeIdleCurrentTask(f);assert(request);assert(lease.isCurrent());assert.equal(lease.routeRecord,record);
  assert.equal(record.safeUntil,binding.reference.endTime);assert.equal(lease.executionEnd,binding.reference.endTime);assert.equal(lease.executionEpoch,binding.reference.worldBoundary.effectiveTime);
  f.advance(.4);assert.deepEqual(f.body(1),body);assert(lease.isCurrent());assert.equal(lease.executionEnd,binding.reference.endTime);
 }finally{f.close();}
});
