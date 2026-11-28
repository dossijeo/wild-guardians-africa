import test from 'node:test';import assert from 'node:assert/strict';
import {nativeFarmMovingTaskFixture as fixture} from './helpers/native-farm-moving-task.js';
import {tick,emit} from '../src/simulation/game.js';import {createPlant} from '../src/simulation/crops.js';
import {enqueue,replaceTasks} from '../src/simulation/tasks.js';
import {createNativeIntentProduction} from '../src/simulation/native-intent-production.js';

for(const invalidate of ['none','task','home'])test(`ordinary Farm continuation dispatch keeps a stable source while held, then handles ${invalidate}`,async()=>{
 const f=fixture(),calls=[],prepared=[],errors=[];let production,release;try{
  tick(f.state,.01,f.nav);assert(f.planner.nativeFarmArrivalContinuationSource(f.actor));const body=f.body(1);
  // Observe dispatch at a controlled operation boundary. No native commit,
  // graphical preparation handle or GPU receipt is manufactured here.
  const planner={...f.planner,continueNativeFarmArrivalAfterGpuQuiescence(options){calls.push(options);const p=f.planner.prepareNativeFarmArrivalContinuationProposal(f.planner.nativeFarmArrivalHeldExecution(f.actor));assert.equal(p.status,'proposed');options.prepareResources({resources:p.proposal,signal:options.signal,deferredStart:true});return new Promise(resolve=>release=()=>{f.planner.cancelNativeFarmArrivalRouteProposal(p.proposal.ticket);resolve({status:'cancelled'});});}};
  production=createNativeIntentProduction({state:f.state,planner,bodyId:()=>1,getPublication:()=>({status:()=>({coherent:true,closed:false})}),getResources:()=>({status:()=>({phase:'running',pending:false,retained:false}),prepareNativeFarmArrivalResources(resources,options){prepared.push({resources,options});return Promise.resolve({dispatchObservation:true});}}),publicationSequence:()=>9,terrainManifest:()=>({epoch:'dispatch-observation',chunks:[]}),onError:e=>errors.push(e)});
  const pending=production.wake();assert.equal(calls.length,1);assert.equal(prepared.length,1);assert.equal(prepared[0].resources.kind,'native-farm-arrival-route-proposal');assert(prepared[0].resources.sourceHeld);assert.equal(prepared[0].options.minSequence,9);assert.equal(prepared[0].options.deferredStart,true);assert.equal(production.status().active.kind,'farm-arrival-continuation');
  tick(f.state,.05,f.nav);production.wake();assert.equal(calls[0].signal.aborted,false);assert.deepEqual(f.body(1),body);assert.equal(calls.length,1);
  if(invalidate==='task')f.requestTask();else if(invalidate==='home'){f.worker.contractDay--;tick(f.state,.01,f.nav);}production.wake();assert.equal(calls[0].signal.aborted,invalidate!=='none');release();await pending;assert.deepEqual(f.body(1),body);assert.deepEqual(errors,[]);
 }finally{release?.();production?.dispose();f.close();}
});

test('withdrawal AFTER actual24 preserves its held body and produces a prepared continuation of the original Farm goal',()=>{
 const f=fixture({stop:false});try{
  const p=f.point(6,0),crop=createPlant(`plant-${f.state.nextId++}`,'mijo',p.x,p.z,f.worker.centerId);crop.growth=999999;crop.harvestRequested=true;crop.water=[];f.state.plants.push(crop);emit(f.state,'CropPlaced',{targetId:crop.id});enqueue(f.state,f.worker.centerId,'harvest',crop.id);tick(f.state,.1,f.nav);assert.equal(f.planner.nativeFarmArrivalStopRequest(f.actor).reason,'task');
  const stop=f.planner.prepareNativeFarmArrivalStopProposal(f.actor);tick(f.state,.1,f.nav);const fresh=f.planner.revalidateNativeFarmArrivalStopProposal(stop.ticket);assert.equal(fresh.status,'revalidated');assert.equal(f.w.spatial_world_proposal_stop_commit_bound(...f.tuple().slice(0,5),stop.ticket.ticket),1);assert.equal(f.planner.commitNativeCausalClock().status,'committed');f.planner.nativeFarmArrivalStopBinding(fresh.proposal.nativeStop,stop.proposal.nativeStop,{projection:{version:1,routeEffects:fresh.proposal.routeEffects,gateEffects:fresh.proposal.gateEffects}});
  crop.growth=0;crop.harvestRequested=false;crop.water=createPlant('shape','mijo',0,0,null).water.map(w=>({...w,status:'manual'}));replaceTasks(f.state,f.state.tasks.filter(t=>t.targetId!==crop.id));const body=f.body(1);tick(f.state,1,f.nav);const source=f.planner.nativeFarmArrivalContinuationSource(f.actor);assert(source);assert.equal(f.worker.taskId,null);assert.equal(f.worker.nativeRouteAdmission,'native-farm-arrival-held');assert.deepEqual(f.body(1),body);const proposal=f.planner.prepareNativeFarmArrivalContinuationProposal(source);assert.equal(proposal.status,'proposed');assert.deepEqual(proposal.proposal.sourceRequest,f.farmBinding.reference.sourceRequest);assert.deepEqual(proposal.proposal.sourceHeld.pose,source.pose);assert.equal(f.planner.nativeFarmArrivalRequestReference(f.actor),null);
 }finally{f.close();}
});

test('an invalid Home source cannot cancel another prepared Farm continuation',()=>{
 const f=fixture();try{const source=f.planner.nativeFarmArrivalHeldExecution(f.actor),p=f.planner.prepareNativeFarmArrivalContinuationProposal(source);assert.equal(p.status,'proposed');const body=f.body(1);assert.notEqual(f.w.nav_intent_farm_arrival_home_request(f.actor,source.resumeHandle.session,source.assignmentSequence+1,source.resumeHandle.generation,999,0,0),1);assert.equal(f.planner.revalidateNativeFarmArrivalRouteProposal(p.proposal.ticket).status,'revalidated');assert.deepEqual(f.body(1),body);}finally{f.close();}
});
