import assert from 'node:assert/strict';
import test from 'node:test';
import {nativeTaskRequestFixture} from './helpers/native-task-resource-requests.js';
import {createNativeTaskGameFixture} from './helpers/native-task-game-execution.js';
import {createNativeAdmissionVertical} from './helpers/native-admission-vertical.js';
import {registerNativeAdmissionContract} from './helpers/native-admission-contract.js';
import {tick} from '../src/simulation/game.js';
import {releaseTask,notifyWorkerPlanningChange} from '../src/simulation/tasks.js';

// Two different native operations consume the same production vertical and
// the same failure/progress contract. New task kinds reuse the action adapter.
for(const kind of ['task-start','task-action'])registerNativeAdmissionContract(kind,async hooks=>{
  const acting=kind==='task-action',native=acting?createNativeTaskGameFixture():nativeTaskRequestFixture({bindBodies:true});
  let vertical;
  try{
    if(acting)tick(native.state,native.proposals[0].endTime-native.state.elapsed+.05,native.nav);else native.claim();
    const planner=native.planner,actor=native.state.workers[0].id;
    vertical=await createNativeAdmissionVertical({planner,elapsed:native.state.elapsed,kind,...hooks});
    return {vertical,
      time:()=>native.state.elapsed,held:()=>native.body(1),peer:()=>native.body(acting?3:2),
      advance(dt){native.state.elapsed+=dt;assert.equal(planner.advanceNativeRouteExecution(native.state.elapsed).status,'advanced');planner.commitNativeCausalClock();},
      binding:()=>acting?planner.nativeTaskActionBinding(actor):planner.nativeTaskStartBinding(actor),
      run:signal=>vertical.run(options=>acting?
        planner.startNativeTaskActionAfterGpuQuiescence({...options,request:planner.nativeTaskActionRequest(actor)}):
        planner.startNativeTaskRouteAfterGpuQuiescence({...options,request:planner.pendingTaskRoute(actor),policy:{bodyId:1,radius:.28,urgent:true,runRemaining:4}}),{signal}),
      cancel(){const worker=native.state.workers[0];releaseTask(native.state,worker);worker.status='idle';notifyWorkerPlanningChange(native.state,worker);planner.flushTaskEvents();planner.commitNativeCausalClock();},
      async close(){await vertical.close();native.close();}
    };
  }catch(error){await vertical?.close();native.close();throw error;}
});

test('one resident vertical admits a real route, its arrival and its action without replacing owners',{timeout:15000},async()=>{
  const native=nativeTaskRequestFixture({bindBodies:true});let vertical;
  try{
    native.claim();const planner=native.planner,actor=native.state.workers[0].id;
    const advance=at=>{native.state.elapsed=at;assert.equal(planner.advanceNativeRouteExecution(at).status,'advanced');planner.commitNativeCausalClock();};
    vertical=await createNativeAdmissionVertical({planner,elapsed:native.state.elapsed,kind:'task-start',
      onReady:()=>advance(native.state.elapsed+.2),onDrain:()=>advance(native.state.elapsed+.02)});
    const source=vertical.source,client=vertical.client,host=vertical.host,connection=vertical.connection;
    const route=await vertical.run(options=>planner.startNativeTaskRouteAfterGpuQuiescence({...options,
      request:planner.pendingTaskRoute(actor),policy:{bodyId:1,radius:.28,urgent:true,runRemaining:4}}));
    assert.equal(route.status,'committed',JSON.stringify(route));await vertical.present();
    const timing=planner.nativeRouteTiming(route.nativeRoute.routeHandle);advance(timing.endTime+.05);
    assert.equal(planner.nativeTaskExecution(actor).arrived,true);
    // The existing native declaration supplies action facts. No test timer or
    // JavaScript assignment advances the route or authorizes the action.
    assert.equal(planner.requestNativeTaskActionResources(actor,{kind:'harvest',duration:2.4,heading:0}),true);
    const body=native.body(1),action=await vertical.run(options=>planner.startNativeTaskActionAfterGpuQuiescence({...options,
      request:planner.nativeTaskActionRequest(actor)}),{kind:'task-action'});
    assert.equal(action.status,'committed',JSON.stringify(action));await vertical.present();
    assert.deepEqual(native.body(1),body);assert.equal(planner.nativeRouteTiming(route.nativeRoute.routeHandle),null);
    assert.equal(vertical.source,source);assert.equal(vertical.client,client);assert.equal(vertical.host,host);assert.equal(vertical.connection,connection);
    assert.equal(vertical.counters().preparations,2);assert.equal(vertical.counters().commits,2);
    const binding=planner.nativeTaskActionBinding(actor),buffers=vertical.gpu.buffers.length;
    advance(binding.reference.endTime+.1);host.present();host.present();
    assert.equal(planner.nativeTaskActionExecution(actor).completed,true);assert.equal(vertical.gpu.buffers.length,buffers);
    assert.deepEqual(native.body(1),body);assert.equal(native.state.crates.length,0,'completion cannot bypass consequence admission');
    assert.deepEqual(vertical.errors,[]);
  }finally{await vertical?.close();native.close();}
});
