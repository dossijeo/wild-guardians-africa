import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,PerspectiveCamera,Vector3} from 'three';
import {createWebGpuPicker} from '../src/rendering/webgpu-picker.js';
import {nativeHomeArrivalGraphicsFixture} from './helpers/native-home-arrival-graphics.js';

function snapshot(root){const list=[];root.traverse(m=>{if(m.isMesh&&!m.userData.wgCpuPickProxy)list.push({mesh:m,geometry:m.geometry,index:m.geometry.index,material:m.material,visible:m.visible});});return list;}

for(const mode of ['exact','late-reuse','late-refresh'])test(`an arrived Home actor prepares reversible absence without replacing resident resources (${mode})`,async()=>{
 const f=await nativeHomeArrivalGraphicsFixture();let part;try{const actor=f.roster.get(f.actor),root=actor.root,before=snapshot(root),owned=f.registry.status().owned.length,body=f.body(1),sibling=new Group();f.scene.add(sibling);const parent=root.parent;
  part=await f.roster.prepareNativeHomeArrivalProposal(f.proposal);assert(part.valid());assert.deepEqual(part.requests,[]);assert.equal(root.visible,true);assert.equal(part.retire(),false);assert.equal(f.registry.status().owned.length,owned);assert.deepEqual(f.body(1),body);part.activate();assert.equal(root.visible,false);assert.equal(root.parent,parent);assert(part.valid());part.rollback();assert.equal(root.visible,true);assert(part.valid());let actual=f.proposal;
  if(mode!=='exact'){f.advance(.3);f.planner.projectNativeHomeExecution(f.nativeState,f.worker);const next=f.planner.revalidateNativeHomeArrivalProposal(f.proposal.ticket);assert.equal(next.status,'revalidated');assert(next.timeTranslation.sameSourceState);actual=next.proposal;if(mode==='late-refresh')assert(part.retarget(actual));}
  part.activate();part.afterCapture();assert.equal(root.visible,true);assert(part.valid());const data=f.commitArrival(actual,mode==='late-refresh'?actual:f.proposal);part.finalize(data);assert.equal(part.cancel(),false);assert.equal(root.visible,false);assert.equal(f.roster.get(f.actor),actor);assert.equal(f.acquires,1);assert.equal(f.registry.status().owned.length,owned);assert.equal(sibling.visible,true);for(const v of before){assert.equal(v.mesh.geometry,v.geometry);assert.equal(v.mesh.geometry.index,v.index);assert.equal(v.mesh.material,v.material);assert.equal(v.mesh.visible,v.visible);}assert.equal(part.retire(),true);assert.equal(part.retire(),false);f.flush();assert.equal(f.roster.status().native,0);assert.equal(root.visible,false);assert.equal(sibling.parent,f.scene);f.state.workers=[];f.roster.sync();f.flush();assert.equal(f.registry.status().owned.length,0);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

for(const activated of [false,true])test(`cancelling Home absence retains the exact Home actor and its live body (${activated?'captured':'before capture'})`,async()=>{
 const f=await nativeHomeArrivalGraphicsFixture();let part;try{const actor=f.roster.get(f.actor),before=snapshot(actor.root),owned=f.registry.status().owned.length,body=f.body(1);part=await f.roster.prepareNativeHomeArrivalProposal(f.proposal);if(activated)part.activate();assert(part.cancel());assert.equal(part.cancel(),false);f.flush();assert.equal(actor.root.visible,true);assert.equal(f.roster.get(f.actor),actor);assert.equal(f.roster.status().native,1);assert.equal(f.registry.status().owned.length,owned);for(const v of before)assert.equal(v.mesh.material,v.material);assert.deepEqual(f.body(1),body);assert.deepEqual(f.planner.nativeHomeRouteBinding(f.actor),f.homeSource);assert.deepEqual(f.errors,[]);
 }finally{part?.cancel();f.close();}
});

test('Home absence removal before commit or presentation retires the old owner once',async()=>{
 for(const committed of [false,true]){const f=await nativeHomeArrivalGraphicsFixture();let part;try{part=await f.roster.prepareNativeHomeArrivalProposal(f.proposal);part.activate();if(committed){part.afterCapture();part.finalize(f.commitArrival());}f.state.workers=[];f.roster.sync();f.flush();assert.equal(part.valid(),false);assert.equal(part.cancel(),false);if(committed){assert.equal(part.retire(),true);assert.equal(part.retire(),false);f.flush();}assert.equal(f.registry.status().owned.length,0);assert.deepEqual(f.errors,[]);
  }finally{part?.cancel();f.close();}}
});

test('Home absence rejects another source and modified endpoint semantics before hiding its actor',async()=>{
 for(const mode of ['source','pose','contract']){const f=await nativeHomeArrivalGraphicsFixture();try{const proposal=structuredClone(f.proposal),actor=f.roster.get(f.actor),body=f.body(1);if(mode==='source'){proposal.nativeHomeArrival.sourceHome.reference.sourceControlSequence++;proposal.nativeHomeArrival.sourceHome.preparedReference.sourceControlSequence++;}else if(mode==='pose')f.state.workers[0].walkPhase++;else f.state.workers[0].villageId='village-999999';await assert.rejects(f.roster.prepareNativeHomeArrivalProposal(proposal),/Home|endpoint/);assert.equal(actor.root.visible,true);assert.deepEqual(f.body(1),body);assert.equal(f.roster.status().nativePreparing,0);
  }finally{f.close();}}
});


test('ordinary picking retains the presented Home endpoint while absence is ready and drops it only after commit',async()=>{
 const f=await nativeHomeArrivalGraphicsFixture();let part;try{const r=f.proposal.nativeHomeArrival,p=r.pose,camera=new PerspectiveCamera(45,1,.1,100),y=f.residency.surface(p.x,p.z);camera.position.set(p.x,y+3,p.z+6);camera.lookAt(p.x,y+.8,p.z);camera.updateMatrixWorld(true);const picker=createWebGpuPicker({scene:f.scene,camera,state:f.state,animals:{get:()=>null},workers:f.roster,cropBounds:()=>[]}),hit=()=>[.7,1,1.3,.4,1.5].some(height=>{const v=new Vector3(p.x,y+height,p.z).project(camera);return picker.pick({x:v.x,y:v.y}).entityId===f.actor;});assert(hit());part=await f.roster.prepareNativeHomeArrivalProposal(f.proposal);part.activate();part.afterCapture();assert.equal(f.roster.get(f.actor).root.visible,true);assert(hit(),'READY must preserve the still presented Home body');part.finalize(f.commitArrival());assert.equal(hit(),false,'the committed absence must not retain a selectable ghost');assert(part.retire());f.flush();assert.equal(hit(),false);assert.deepEqual(f.errors,[]);}finally{part?.cancel();f.close();}
});
