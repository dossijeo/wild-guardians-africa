import test from 'node:test';
import assert from 'node:assert/strict';
import {Scene,MeshBasicMaterial,DoubleSide,PerspectiveCamera,Mesh,BoxGeometry} from 'three';
import {MeshStandardNodeMaterial,WebGPURenderer} from 'three/webgpu';
import {nativeTaskSettlementFixture} from './helpers/native-task-settlement.js';
import {createWebGpuTerrainResidency} from '../src/rendering/webgpu-terrain-residency.js';
import {createConfirmedTerrainSupport} from '../src/rendering/confirmed-terrain-support.js';
import {createNativeTaskSettlementGpuMotion} from '../src/rendering/native-task-settlement-gpu-motion.js';
import {installRemoteClockBindings} from '../src/rendering/remote-clock-bindings.js';

function fixture(){
 const f=nativeTaskSettlementFixture(),scene=new Scene(),material=new MeshBasicMaterial({side:DoubleSide}),residency=createWebGpuTerrainResidency({scene,material});
 for(let z=-1;z<=1;z++)for(let x=-1;x<=1;x++){f.session.core.selectChunk(x,z);residency.replace(f.session.core.chunkPayload(),1,'settlement-motion');}
 const terrain=createConfirmedTerrainSupport({residency}),proposal=f.prepareSettlement().proposal,reference=proposal.nativeSettlement,support=terrain.prepareNativeTaskSettlement(reference);assert(support?.valid());
 return {...f,scene,terrain,residency,reference,support,proposal,close(){terrain.dispose();residency.dispose();material.dispose();f.close();}};
}

test('settlement uses one stationary transform, original Idle phases and submitted float ages without an action duration',()=>{
 const f=fixture();let motion;try{const {x,z,yaw}=f.reference.pose;motion=createNativeTaskSettlementGpuMotion({actorId:f.actor,support:f.support,anchorPosition:{x:2,y:3,z:4},anchorYaw:.2,heightOffset:.025});assert.deepEqual(motion.clipNames,['Idle']);assert.equal(motion.clockNode.value,0);const tag=motion.clockNode[Symbol.for('wild-guardians.remote-clock')];assert.deepEqual(tag.nativeSettlement,f.reference);assert.equal(tag.nativeAction,undefined);assert.equal(tag.resourceEnd,undefined);assert.equal(motion.status().installed.end,undefined);
  for(const age of [0,Math.fround(.1),8192]){assert.equal(motion.sampleClip(age),'Idle');assert.equal(motion.sampleForClip(age,'Idle',2.5),age);assert(motion.resolve(null,'Idle',2.5).isNode);const p=motion.sample(age);assert.equal(p.x,Math.fround(x));assert.equal(p.z,Math.fround(z));assert.equal(p.yaw,Math.fround(yaw));assert.equal(p.dx,Math.fround(x)-2);assert.equal(p.currentSpeed,0);}
  for(const age of [-1,.1,Infinity])assert.throws(()=>motion.sample(age),/submitted relative float/);assert.throws(()=>motion.resolve(null,'Harvest',2),/clip/);assert.throws(()=>motion.resolve(null,'Idle',Number.MIN_VALUE),/clip/);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);assert.equal(motion.clockNode.value,0);
 }finally{motion?.dispose();f.close();}
});

test('stationary support reuses the confirmed terrain kernel and invalidates changed foot triangles',()=>{
 const f=fixture();try{const {x,z}=f.reference.pose,cx=Math.floor((x+24)/48),cz=Math.floor((z+24)/48),key=`${cx},${cz}`;assert(f.support.unchangedBy({changedKeys:new Set(['4,4'])}));assert.equal(f.support.unchangedBy({changedKeys:new Set([key]),get:()=>null}),false);assert.throws(()=>f.terrain.prepareNativeTaskAction(f.reference),/action reference/);assert.throws(()=>createNativeTaskSettlementGpuMotion({actorId:f.actor,support:{...f.support,point:{...f.support.point,at:f.support.point.at+1}}}),/support/);f.residency.get(cx,cz).geometry.attributes.position.needsUpdate=true;assert.equal(f.support.valid(),false);assert.throws(()=>createNativeTaskSettlementGpuMotion({actorId:f.actor,support:f.support}),/support/);}finally{f.close();}
});

test('revalidating settlement retags the same graph and material and fails closed for a changed physical pose',()=>{
 const f=fixture(),hook=installRemoteClockBindings({backend:{get:()=>({buffer:null}),updateBinding(){}}},{registerClockBinding(){throw Error('No compiled uniform');}}),material=new MeshStandardNodeMaterial();let motion;
 try{motion=createNativeTaskSettlementGpuMotion({actorId:f.actor,support:f.support});motion.bind(material);const position=material.positionNode,clock=motion.clockNode,key=clock.getCacheKey(),clip=motion.clipNode;f.advance(.3);const next=f.planner.revalidateNativeTaskSettlementProposal(f.proposal.ticket);assert.equal(next.status,'revalidated');const support=f.terrain.prepareNativeTaskSettlement(next.proposal.nativeSettlement);assert.equal(motion.retargetNativeTaskSettlement(support,{retagClock:hook.retagNativeTaskSettlement}).changedData,false);assert.equal(motion.clockNode,clock);assert.equal(clock.getCacheKey(),key);assert.equal(motion.clipNode,clip);assert.equal(material.positionNode,position);assert.deepEqual(clock[Symbol.for('wild-guardians.remote-clock')].nativeSettlement,next.proposal.nativeSettlement);const changed={...support,reference:{...support.reference,pose:{...support.reference.pose,yaw:support.reference.pose.yaw+.1}}};assert.equal(motion.retargetNativeTaskSettlement(changed,{retagClock:hook.retagNativeTaskSettlement}),false);motion.seal();assert.throws(()=>motion.retargetNativeTaskSettlement(support,{retagClock:hook.retagNativeTaskSettlement}),/published/);motion.dispose();assert.equal(material.positionNode,null);assert.throws(()=>motion.sample(0),/disposed/);}finally{motion?.dispose();material.dispose();hook.dispose();f.close();}
});

test('the real Three shader builder retains the typed Idle clock and material transform with no trajectory texture',()=>{
 const f=fixture(),geometry=new BoxGeometry(),material=new MeshStandardNodeMaterial(),mesh=new Mesh(geometry,material),gpu=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});gpu.hasFeature=()=>true;let motion;
 try{motion=createNativeTaskSettlementGpuMotion({actorId:f.actor,support:f.support});motion.bind(material);material.positionNode=material.positionNode.add(motion.resolve(null,'Idle',2).mul(0));f.scene.add(mesh);const builder=gpu.backend.createNodeBuilder(mesh,gpu);builder.scene=f.scene;builder.camera=new PerspectiveCamera();builder.build();const tags=builder.getBindings().flatMap(g=>g.bindings??[]).flatMap(b=>b.uniforms??[]).map(u=>u.nodeUniform?.node?.[Symbol.for('wild-guardians.remote-clock')]).filter(t=>t?.nativeSettlement);assert(tags.length>0);assert(tags.every(t=>t.nativeAction===undefined&&t.nativeRoute===undefined));assert.match(builder.vertexShader,/max/);assert.doesNotMatch(builder.vertexShader,/textureLoad/);assert.equal(f.planner.nativeTaskSettlementBinding(f.actor),null);}finally{motion?.dispose();geometry.dispose();material.dispose();f.close();}
});
