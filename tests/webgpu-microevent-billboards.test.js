import test from 'node:test';
import assert from 'node:assert/strict';
import {PerspectiveCamera,Scene,Texture} from 'three';
import {WebGPURenderer} from 'three/webgpu';
import {createWebGpuMicroeventLayer} from '../src/microevents/webgpu-billboard-layer.js';
import {createWebGpuMicroeventReceiver} from '../src/microevents/webgpu-billboard-receiver.js';
import {createWebGpuMicroeventSender} from '../src/microevents/webgpu-billboard-sender.js';
import {createRemoteMicroeventBillboards} from '../src/microevents/webgpu-remote-billboards.js';
import {InteractiveParticles} from '../src/microevents/particles.js';
import {EVENTS} from '../src/microevents/definitions.js';

test('WebGPU microevent layer consumes the existing instance layout in order',async()=>{
 const scene=new Scene(),atlas=new Texture(),layer=createWebGpuMicroeventLayer({scene,state:{time:80},atlas,capacity:2});
 try{
  await layer.ready;const root=scene.getObjectByName('microevent-world'),mesh=root.children[0],instances=new Float32Array([1,2,3,4,5,.5,.1,.2,.3,.4,1,.8,.7,.6,0]);
  assert.equal(mesh.material.isNodeMaterial,true);assert.equal(mesh.visible,true);assert.equal(root.visible,false);
  const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=scene;builder.camera=new PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/aCenter/);assert.match(builder.fragmentShader,/textureSample/);
  assert.equal(layer.update({sequence:1,origin:[10,11,12],light:.68,instances}),1);assert.deepEqual(root.position.toArray(),[10,11,12]);assert.equal(mesh.geometry.instanceCount,1);assert.deepEqual(Array.from(mesh.geometry.getAttribute('aCenter').data.array.slice(0,15)),Array.from(instances));assert.equal(root.visible,true);
  assert.throws(()=>layer.update({sequence:1,origin:[0,0,0],light:1,instances}),/Invalid microevent frame/);assert.equal(layer.status().sequence,1);
  assert.throws(()=>layer.update({sequence:2,origin:[0,0,0],light:1,instances:new Float32Array([NaN])}),/Invalid microevent frame/);layer.clear(2);assert.equal(root.visible,false);assert.equal(mesh.geometry.instanceCount,0);
 }finally{layer.dispose();}
 assert.equal(scene.children.length,0);assert.throws(()=>layer.clear(3),/Invalid microevent clear/);
});

test('microevent sender coalesces visual frames and detaches pending preparation on disposal',async()=>{
 const sent=[],sender=createWebGpuMicroeventSender({send:value=>sent.push(value),isOpen:()=>true});
 const prepared=sender.prepare();assert.equal(sender.prepare(),prepared);assert.equal(sent[0].kind,'prepareMicroevents');sender.receive({kind:'microeventPrepareResult'});await prepared;
 const frame=n=>({origin:[n,0,0],light:1,instances:new Float32Array(15)});sender.frame(frame(1));sender.frame(frame(2));sender.frame(frame(3));assert.equal(sent.length,2);assert.equal(sender.status().queued,3);sender.receive({kind:'microeventFrameAck',sequence:1});assert.equal(sent.length,3);assert.equal(sent[2].frame.sequence,3);assert.equal(sent[2].frame.origin[0],3);sender.dispose();assert.throws(()=>sender.frame(frame(4)),/unavailable/);
 const pendingSender=createWebGpuMicroeventSender({send(){},isOpen:()=>true}),pending=pendingSender.prepare();pendingSender.dispose();await assert.rejects(pending,/disposed/);
});

test('microevent receiver cancels an asynchronous atlas load without retaining resources',async()=>{
 const scene=new Scene(),atlas=new Texture();let resolve,closed=0,disposed=0;atlas.image={close(){closed++;}};atlas.addEventListener('dispose',()=>disposed++);const receiver=createWebGpuMicroeventReceiver({scene,state:{},load:()=>new Promise(r=>resolve=r)}),pending=receiver.prepare();await Promise.resolve();receiver.dispose();resolve(atlas);await assert.rejects(pending,/cancelled/);assert.equal(closed,1);assert.equal(disposed,1);assert.equal(scene.children.length,0);
});

test('existing particle emitter feeds WebGPU receiver without a main-thread renderer',async()=>{
 const scene=new Scene(),state={time:100},atlas=new Texture(),receiver=createWebGpuMicroeventReceiver({scene,state,load:async()=>atlas});let seq=0;const sender={prepare:()=>receiver.prepare(),frame:frame=>receiver.update({...frame,sequence:++seq})},billboards=createRemoteMicroeventBillboards({state},sender),particles=new InteractiveParticles();particles.start(EVENTS.seeds,()=>.5);particles.time=1;const space={unit:.045,origin:v=>v.set(2,3,4),offset:(x,y,phase,v)=>v.set(x*.045,y*.045,0)};
 try{await billboards.ready;billboards.draw(particles,space,{});const root=scene.getObjectByName('microevent-world');assert.ok(billboards.count>0);assert.equal(receiver.status().frame.count,billboards.count);assert.deepEqual(root.position.toArray(),[2,3,4]);assert.equal(root.visible,true);billboards.clear();assert.equal(root.visible,false);}finally{billboards.dispose();receiver.dispose();}
});
