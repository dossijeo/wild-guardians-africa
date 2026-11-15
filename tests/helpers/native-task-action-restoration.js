import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createNativeTaskGameFixture} from './native-task-game-execution.js';
import {tick} from '../../src/simulation/game.js';
import {serialize,deserialize} from '../../src/persistence/snapshots.js';
import {createSpatialGameSession} from '../../src/world/wild-engine/spatial-game-session.js';
import {createEventDrivenTaskPlanner} from '../../src/world/wild-engine/spatial-intent-bridge.js';
import {createSpatialNavigationMovement} from '../../src/world/wild-engine/spatial-navigation-movement.js';

const module=new WebAssembly.Module(readFileSync(new URL('../../src/world/wild-engine/spatial-savanna.wasm',import.meta.url)));
function tuple(w){assert.equal(w.nav_intent_barrier_proposal_ticket(),1);return Array.from(new Float64Array(w.memory.buffer,w.nav_intent_barrier_proposal_ticket_ptr(),6));}
// Source-only setup: a genuine executed arrival/action, then semantic save.
// Actual direct/resource/GPU receipt admission is exercised by the vertical.
export function nativeActionSave({progress=.6,core=null,kind='harvest',runBudget=4}={}){
 const f=createNativeTaskGameFixture({core,taskKind:kind,runBudget});try{
  const actor=f.state.workers[0].id;tick(f.state,f.proposals[0].endTime-f.state.elapsed+.05,f.nav);
  const p=f.planner.prepareNativeTaskActionProposal(f.planner.nativeTaskActionRequest(actor));assert.equal(p.status,'proposed');assert.equal(f.w.nav_task_action_proposal_commit_bound(...tuple(f.w).slice(0,5),p.proposal.ticket.ticket),1);f.planner.commitNativeCausalClock();f.planner.projectNativeTaskActionExecution(f.state,f.state.workers[0]);tick(f.state,progress,f.nav);
  return {saved:deserialize(serialize(f.state)),oldBinding:f.planner.nativeTaskActionBinding(actor)};
 }finally{f.close();}
}
export function restoreNativeActionGame(saved,{core=null,admitPeer=true,additionalChunks=[]}={}){
 const state=deserialize(serialize(saved)),loaded=new Map();
 if(core){const first=state.villages[0];core.generate(state.seed,Math.floor((first.x+24)/48),Math.floor((first.z+24)/48),state.biome,state);}
 const session=createSpatialGameSession(module,state,{...(core?{core}:{}),loaded:()=>loaded,onData:data=>loaded.set(`${data.cx},${data.cz}`,data)});
 try{
  for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){if(session.core.selectChunk(x,z)<0)session.core.addChunk(x,z);loaded.set(`${x},${z}`,session.core.chunkPayload());}
  for(const {cx,cz} of additionalChunks){if(session.core.selectChunk(cx,cz)<0)session.core.addChunk(cx,cz);loaded.set(`${cx},${cz}`,session.core.chunkPayload());}
  const planner=createEventDrivenTaskPlanner(session);planner.resetFromState(state);const w=session.core.wasm;
  for(const [i,worker] of state.workers.entries()){if(planner.nativeWorkerHomeInactive(worker.id))continue;const id=i?3:1;assert.equal(w.spatial_body_upsert(id,worker.x,worker.z,.28,0,1),1);assert.equal(w.nav_gate_bind_worker(Number(worker.id.split('-').at(-1)),id),1);}
  assert.equal(planner.commitNativeCausalClock().status,'committed');
  if(admitPeer){const worker=state.workers[1],request=planner.pendingTaskRoute(worker.id);assert(request);const p=planner.prepareNativeTaskStartProposal(request,{bodyId:3,radius:.28,urgent:false,runRemaining:worker.runRemaining??0,runPhase:worker.runPhase??0,walkPhase:worker.walkPhase??0,carryPhase:worker.carryPhase??0});assert.equal(p.status,'proposed');assert.equal(w.nav_task_start_proposal_commit_bound(...tuple(w).slice(0,5),p.proposal.ticket.ticket),1);assert.equal(planner.beginNativeRouteExecution().status,'started');assert.equal(planner.commitNativeCausalClock().status,'committed');}
  const nav=createSpatialNavigationMovement(session,state);nav.intentTaskPlanner=planner;const stopTasks=planner.observeTasks(state),stop=planner.observeWorld(state),fail=()=>{throw Error('Restored native action must not use a JS mover or clearance');};nav.path=fail;nav.workerMotionClear=fail;nav.workerRouteClear=fail;
  const body=id=>{const count=w.spatial_bodies_near(0,0,1e6),rows=Array.from(new Float64Array(w.memory.buffer,w.spatial_bodies_result_ptr(),count*6));for(let i=0;i<count;i++)if(rows[i*6]===id)return rows.slice(i*6,i*6+6);return null;};
  return {state,session,planner,w,nav,actor:state.workers[0].id,worker:state.workers[0],body,tuple:()=>tuple(w),close(){stop();stopTasks();session.dispose();}};
 }catch(error){session.dispose();throw error;}
}
