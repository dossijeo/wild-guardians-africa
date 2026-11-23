import test from 'node:test';
import assert from 'node:assert/strict';
import {nativeActionSave,restoreNativeActionGame} from './helpers/native-task-action-restoration.js';

function stage(f){const p=f.planner.prepareNativeTaskActionProposal(f.planner.nativeTaskActionRequest(f.actor));assert.equal(p.status,'proposed');return p.proposal;}
function header(f){return Array.from(new Float64Array(f.w.memory.buffer,f.w.spatial_world_resource_header_ptr(),9));}

test('first restored Action15 publishes its own exact resource boundary, preserving topology and body',()=>{
 const {saved}=nativeActionSave(),f=restoreNativeActionGame(saved,{admitPeer:false});try{
  assert.equal(f.w.spatial_world_resource_snapshot(),0);const before=f.session.core.snapshot(),body=f.body(1),p=stage(f),tuple=f.tuple();
  assert.equal(f.w.spatial_world_resource_snapshot(),0,'staging is not publication');
  assert.equal(f.w.nav_task_action_proposal_commit_bound(...tuple.slice(0,5),p.ticket.ticket),1);
  assert.equal(f.w.spatial_world_resource_snapshot(),1);assert.deepEqual(header(f).slice(0,6),[1,tuple[0],tuple[1],tuple[3],15,0]);
  assert.deepEqual(f.session.core.snapshot(),before);assert.deepEqual(f.body(1),body);assert.equal(f.w.spatial_world_proposal_result_count(),0);
  const published=header(f);assert.notEqual(f.w.nav_task_action_proposal_commit_bound(...tuple.slice(0,5),p.ticket.ticket),1);assert.deepEqual(header(f),published,'repeated commit cannot republish');
  const ids=f.session.core.applyBarrierChanges([],[{x:1000,z:1000,halfX:1,halfZ:.3,yaw:0}]);assert.equal(ids.length,1);
  assert.equal(f.w.spatial_world_resource_snapshot(),-1,'out-of-boundary mutation still invalidates the publication');assert.deepEqual(header(f),published);
 }finally{f.close();}
});

test('cancelled and rejected restored Action15 cannot publish a resource boundary',()=>{
 const {saved}=nativeActionSave(),f=restoreNativeActionGame(saved,{admitPeer:false});try{
  let p=stage(f),tuple=f.tuple();assert.equal(f.planner.cancelNativeTaskActionProposal(p.ticket),true);
  assert.notEqual(f.w.nav_task_action_proposal_commit_bound(...tuple.slice(0,5),p.ticket.ticket),1);assert.equal(f.w.spatial_world_resource_snapshot(),0);
  p=stage(f);tuple=f.tuple();assert.notEqual(f.w.nav_task_action_proposal_commit_bound(tuple[0]+1,...tuple.slice(1,5),p.ticket.ticket),1);assert.equal(f.w.spatial_world_resource_snapshot(),0);
  assert.equal(f.planner.cancelNativeTaskActionProposal(p.ticket),true);assert.equal(f.w.spatial_world_resource_snapshot(),0);
 }finally{f.close();}
});
