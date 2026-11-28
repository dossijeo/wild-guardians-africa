import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {nativeActionSave,restoreNativeActionGame} from '../tests/helpers/native-task-action-restoration.js';
import {nativeWorkerGraphicsFixture} from '../tests/helpers/native-task-consequence-graphics.js';
import {createSpatialWorld} from '../src/world/wild-engine/spatial-world.js';
import {createIdleState} from '../src/simulation/idle.js';
import {idleFarmAnchor} from '../src/simulation/game.js';
import {PROFILES} from '../src/simulation/workforce.js';
const wasm=new WebAssembly.Module(readFileSync(process.env.QA_BARRIER_WASM??new URL('../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
const meshes=root=>{const result=[];root.traverse(m=>{if(m.isMesh)result.push({mesh:m,geometry:m.geometry,material:m.material});});return result;};

async function setup(){
 const {saved}=nativeActionSave({kind:'initial',progress:.6});saved.workers=saved.workers.slice(0,1);saved.tasks=saved.tasks.filter(t=>t.workerId===saved.workers[0].id);
 const native=restoreNativeActionGame(saved,{core:createSpatialWorld(wasm),admitPeer:false});
 let f;
 try{
  f=await nativeWorkerGraphicsFixture(native,{idle:true,alert:true,clips:['Walk_Skip','Idle','Alert'],initialClip:'Idle'});
  const source=f.planner.nativeTaskCancellationSource(f.actor);assert.equal(source?.phase,6);
  const center=f.nativeState.structures.find(c=>c.id===f.worker.centerId),idle={...createIdleState(f.worker,idleFarmAnchor(f.nativeState,f.worker,center),f.nativeState.seed),approachRetry:0};
  assert.equal(f.w.nav_initial_idle_body_proposal_stage_cancelled_task(source.actorId,source.nativeSession,6,source.sourceSequence,0,PROFILES.findIndex(p=>p.id===f.worker.profile),idle.anchorId.startsWith('farm-plant-')?1:2,Number(idle.anchorId.split('-').at(-1)),idle.rng,idle.remaining),1);
  const tuple=f.tuple(),p=f.planner.captureNativeInitialIdleBodyProposal({kind:'native-initial-idle-body-proposal-ticket',authorityEpoch:f.planner.nativeCausalClock().authorityEpoch,session:tuple[0],ticket:tuple[1]});assert(p);
  const support=f.terrain.prepareNativeInitialIdleBody(p.nativeInitialIdleBody);assert(support?.valid());
  return {...f,proposal:p,support};
 }catch(error){if(f)f.close();else native.close();throw error;}
}

test('pending restored action uses the original authored actor for Idle preparation and rolls back without consuming saved progress',async()=>{
 const f=await setup();let part;
 try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),body=f.body(1),progress=structuredClone(f.worker.nativeTaskAction);
  part=await f.roster.prepareNativeInitialIdleBodyProposal(f.support,{getPickAge:()=>0});assert(part.valid());
  part.activate();part.rollback();assert(part.valid());
  for(const row of before){assert.equal(row.mesh.geometry,row.geometry);assert.equal(row.mesh.material,row.material);}
  assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.deepEqual(f.body(1),body);assert.deepEqual(f.worker.nativeTaskAction,progress);
  assert(part.cancel());assert.equal(f.planner.cancelNativeInitialIdleBodyProposal(f.proposal.ticket),true);
  assert.equal(f.planner.nativeTaskActionBinding(f.actor),null);assert.equal(f.planner.nativeTaskActionRequest(f.actor).initialElapsed,progress.elapsed);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('a saved-progress or marker change cannot publish the pending action cancellation candidate',async()=>{
 const f=await setup();let part;
 try{
  part=await f.roster.prepareNativeInitialIdleBodyProposal(f.support,{getPickAge:()=>0});assert(part.valid());
  const savedElapsed=f.state.workers[0].nativeTaskAction.elapsed;
  f.state.workers[0].nativeTaskAction.elapsed+=.1;assert.equal(part.valid(),false);assert.throws(()=>part.activate(),/Native initial Idle activation unavailable/);
  part.cancel();part=null;f.state.workers[0].nativeTaskAction.elapsed=savedElapsed;f.state.workers[0].nativeRouteAdmission='pending-idle-resources';
  await assert.rejects(f.roster.prepareNativeInitialIdleBodyProposal(f.support,{getPickAge:()=>0}),/matching pending worker/);
 }finally{part?.cancel();f.close();}
});

test('prepared Idle20 finalizes the native pending-source receipt on the same authored actor and body',async()=>{
 const f=await setup();let part;
 try{
  const actor=f.roster.get(f.actor),before=meshes(actor.root),body=f.body(1);
  part=await f.roster.prepareNativeInitialIdleBodyProposal(f.support,{getPickAge:()=>0});part.activate();
  assert.equal(f.w.nav_initial_idle_body_proposal_commit_bound(...f.tuple().slice(0,5),f.proposal.ticket.ticket),1);
  f.planner.commitNativeCausalClock();const binding=f.planner.nativeInitialIdleBodyBinding(f.actor);assert.equal(binding.reference.cancellationSource.phase,6);
  const data={nativeInitialIdleBodyBinding:binding,resources:{version:1,kind:20,phase:'committed',worldBoundary:binding.reference.worldBoundary,nativeInitialIdleBodyBinding:binding}};
  const bad=structuredClone(data);bad.nativeInitialIdleBodyBinding.reference.cancellationSource.sourceSequence++;
  assert.throws(()=>part.validateCommit(bad));assert(part.validateCommit(data));part.finalize(data);f.flush();
  assert.equal(f.roster.get(f.actor),actor);assert.equal(f.roster.status().native,1);assert.equal(f.acquires,1);assert.deepEqual(f.body(1),body);
  for(const row of before)assert.equal(row.mesh.geometry,row.geometry);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});
