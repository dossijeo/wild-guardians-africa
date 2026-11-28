import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeTaskConsequenceFixture} from './helpers/native-task-consequence.js';
import {createNativeAdmissionVertical} from './helpers/native-admission-vertical.js';
import {registerNativeAdmissionContract} from './helpers/native-admission-contract.js';
import {releaseTask,notifyWorkerPlanningChange} from '../src/simulation/tasks.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {flush} from './helpers/remote-webgpu-fixture.js';

async function fixture(hooks={}){
 const f=nativeTaskConsequenceFixture();let vertical;
 try{vertical=await createNativeAdmissionVertical({planner:f.planner,elapsed:f.state.elapsed,kind:'task-consequence',...hooks});return {...f,vertical,time:()=>f.state.elapsed,held:()=>f.body(1),peer:()=>f.body(3),binding:()=>f.planner.nativeTaskConsequenceBinding(f.actor),
  run:signal=>vertical.run(options=>f.planner.startNativeTaskConsequenceAfterGpuQuiescence({...options,actorId:f.actor}),{signal}),
  cancel(){releaseTask(f.state,f.worker);f.worker.status='idle';notifyWorkerPlanningChange(f.state,f.worker);f.planner.flushTaskEvents();f.planner.commitNativeCausalClock();},
  async close(){await vertical.close();f.close();}};
 }catch(error){await vertical?.close();f.close();throw error;}
}

registerNativeAdmissionContract('task-consequence',fixture);

test('the real source/resource/consumer channels confirm the exact consequence template before Game commits and replay its issued clock',async()=>{
 const f=await fixture();try{const before=f.state.nextId,result=await f.run();assert.equal(result.status,'committed',JSON.stringify(result));const proof=f.binding();assert.equal(result.receipt.nativeTaskConsequenceVersion,1);assert.deepEqual(result.receipt.preparedTaskConsequenceTemplate,proof.preparedReference);assert.equal(f.state.nextId,before+1);assert.equal(f.state.crates.length,1);assert.equal(f.target.alive,false);assert.equal(f.worker.status,'carrying');assert.equal(f.worker.nativeRouteAdmission,'native-delivery');await f.vertical.present();
  const first=captureNativeRoutePickFrame(f.vertical.host.inspect()),r=proof.preparedReference;assert.equal(first.getConsequenceExecutionTime(r,r.worldBoundary.effectiveTime),proof.reference.worldBoundary.effectiveTime);f.advance(.15);await flush();await f.vertical.host.idle();f.vertical.host.present();const next=captureNativeRoutePickFrame(f.vertical.host.inspect());assert(next.getConsequenceExecutionTime(r,r.worldBoundary.effectiveTime)>first.getConsequenceExecutionTime(r,r.worldBoundary.effectiveTime));assert(next.getConsequenceExecutionTime(r,r.worldBoundary.effectiveTime)<=f.state.elapsed);assert.equal(f.state.crates.length,1);assert.equal(f.state.crates[0].delivered,false);assert.deepEqual(f.vertical.errors,[]);
 }finally{await f.close();}
});
