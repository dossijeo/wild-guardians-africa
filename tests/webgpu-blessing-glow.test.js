import test from 'node:test';import assert from 'node:assert/strict';import * as THREE from 'three';import {WebGPURenderer} from 'three/webgpu';import {createWebGpuBlessingGlow} from '../src/rendering/webgpu-blessing-glow.js';
const turn=()=>new Promise(resolve=>setImmediate(resolve));
function fixture({prepareTexture=async()=>{}}={}){const deferred=[],draws=[],errors=[],copies=[];let width=100,height=80;const renderer={backend:{isWebGPUBackend:true,device:{queue:{onSubmittedWorkDone:async()=>{}}}},autoClear:true,getRenderTarget:()=>null,getDrawingBufferSize:v=>v.set(width,height),copyFramebufferToTexture(texture){copies.push(texture);},render(scene,camera){for(const mesh of scene.children)mesh.onBeforeRender(this,scene,camera,mesh.geometry,mesh.material,null);draws.push({scene,camera,autoClear:this.autoClear});}},admission={prepareTicket(mesh,options){return new Promise(resolve=>deferred.push({mesh,options,resolve}));},deferCompilations:fn=>fn()},glow=createWebGpuBlessingGlow({renderer,admission,prepareTexture,onError:error=>errors.push(error.message)});return {renderer,glow,deferred,draws,errors,copies,resize(w,h){width=w;height=h;}};}
test('glow waits for admission, renders after preparation and restores renderer state',async()=>{const f=fixture();try{assert.equal(f.glow.render(),false);await turn();assert.equal(f.deferred.length,1);assert.equal(f.draws.length,0);f.deferred[0].resolve({valid:()=>true});await turn();assert.equal(f.glow.render(),true);assert.equal(f.draws.length,1);assert.equal(f.draws[0].autoClear,false);assert.equal(f.renderer.autoClear,true);}finally{f.glow.dispose();}});
test('resizing never draws the old framebuffer and ignores superseded admissions',async()=>{const f=fixture();try{f.glow.render();await turn();f.deferred[0].resolve({valid:()=>true});await turn();assert.equal(f.glow.render(),true);f.resize(200,120);assert.equal(f.glow.render(),false);await turn();assert.equal(f.deferred.length,2);f.resize(300,180);assert.equal(f.glow.render(),false);await turn();assert.equal(f.deferred.length,3);f.deferred[1].resolve({valid:()=>true});await turn();assert.equal(f.glow.render(),false);f.deferred[2].resolve({valid:()=>true});await turn();assert.equal(f.glow.render(),true);assert.deepEqual([f.glow.status().width,f.glow.status().height],[300,180]);}finally{f.glow.dispose();}});
test('glow graph builds screen extraction and blur WGSL without a GPU',async()=>{const f=fixture(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;renderer.backend.renderer=renderer;try{f.glow.render();await turn();const {mesh,options}=f.deferred[0],builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=options.targetScene;builder.camera=options.passCamera;builder.build();assert.match(builder.fragmentShader,/textureSample/);assert.match(builder.fragmentShader,/smoothstep/);const captures=builder.updateBeforeNodes.filter(node=>node.isOutputTextureNode);assert.equal(captures.length,0,'compilation must not sample the canvas');assert.equal(mesh.material.depthWrite,false);assert.equal(mesh.material.blending,THREE.AdditiveBlending);}finally{f.glow.dispose();}});
test('aborting the surface retires an in-flight glow without drawing late results',async()=>{const f=fixture();try{f.glow.render();await turn();const candidate=f.deferred[0];f.glow.dispose();candidate.resolve({valid:()=>true});await turn();assert.equal(f.glow.render(),false);assert.equal(f.draws.length,0);assert.equal(f.glow.status().closed,true);}finally{f.glow.dispose();}});
test('a stale admitted pipeline is not drawn and a replacement is requested',async()=>{const f=fixture();let valid=true;try{f.glow.render();await turn();f.deferred[0].resolve({valid:()=>valid});await turn();assert.equal(f.glow.render(),true);valid=false;assert.equal(f.glow.render(),false);await turn();assert.equal(f.deferred.length,2);assert.equal(f.draws.length,1);f.deferred[1].resolve({valid:()=>true});await turn();assert.equal(f.glow.render(),true);}finally{f.glow.dispose();}});


test('glow orders uploads only after the surrounding synchronous frame closes',async()=>{
 let open=true,uploads=0;const f=fixture({prepareTexture:async()=>{assert.equal(open,false);uploads++;}});
 try{assert.equal(f.glow.render(),false);assert.equal(uploads,0);open=false;await turn();assert.equal(uploads,1);assert.deepEqual(f.errors,[]);assert.equal(f.deferred.length,1);}finally{f.glow.dispose();}
});
test('retirement before the frame closes prevents scheduled uploads and waits outside it',async()=>{
 let open=true,uploads=0,fences=0;const f=fixture({prepareTexture:async()=>{uploads++;}});
 f.renderer.backend.device.queue.onSubmittedWorkDone=async()=>{assert.equal(open,false);fences++;};
 f.glow.render();f.glow.dispose();open=false;await turn();assert.equal(uploads,0);assert.equal(f.deferred.length,0);assert.equal(fences,1);assert.deepEqual(f.errors,[]);
});
test('real Three graph preparation cannot capture an expiring canvas texture',async()=>{
 const f=fixture(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},r=new WebGPURenderer({canvas});r.hasFeature=()=>true;r.backend.renderer=r;
 try{f.glow.render();await turn();const {mesh,options}=f.deferred[0],builder=r.backend.createNodeBuilder(mesh,r);builder.scene=options.targetScene;builder.camera=options.passCamera;builder.build();
  // r180 compileAsync invokes both this callback and updateBefore nodes.
  mesh.onBeforeRender(f.renderer,options.targetScene,options.passCamera,mesh.geometry,mesh.material,null);
  for(const node of builder.updateBeforeNodes)node.updateBefore({renderer:f.renderer});
  assert.equal(f.copies.length,0,'compilation must not obtain or copy the canvas');
  f.deferred[0].resolve({valid:()=>true});await turn();assert.equal(f.glow.render(),true);assert.equal(f.copies.length,1);
 }finally{f.glow.dispose();}
});
test('each admitted draw captures its own frame once into the same resident texture',async()=>{
 const f=fixture(),events=[];let frame=1,inDraw=false;f.renderer.copyFramebufferToTexture=texture=>{assert(inDraw);events.push({kind:'capture',frame,texture});};
 const draw=f.renderer.render;f.renderer.render=function(scene,camera){inDraw=true;try{draw.call(this,scene,camera);events.push({kind:'draw',frame});}finally{inDraw=false;}};
 try{f.glow.render();await turn();assert.equal(events.length,0);f.deferred[0].resolve({valid:()=>true});await turn();
  f.glow.render();frame=2;f.glow.render();assert.deepEqual(events.map(({kind,frame})=>[kind,frame]),[['capture',1],['draw',1],['capture',2],['draw',2]]);assert.equal(events[0].texture,events[2].texture);
  f.resize(200,100);assert.equal(f.glow.render(),false);assert.equal(events.length,4);await turn();f.deferred[1].resolve({valid:()=>true});await turn();frame=3;f.glow.render();assert.equal(events[4].kind,'capture');assert.notEqual(events[4].texture,events[0].texture);
 }finally{f.glow.dispose();}
});
test('failed draw revokes its capture scope and restores renderer state',async()=>{
 const f=fixture();try{f.glow.render();await turn();const {mesh,options}=f.deferred[0];f.deferred[0].resolve({valid:()=>true});await turn();
  const capture=f.renderer.copyFramebufferToTexture;f.renderer.copyFramebufferToTexture=()=>{throw Error('capture failure');};assert.throws(()=>f.glow.render(),/capture failure/);assert.equal(f.renderer.autoClear,true);
  f.renderer.copyFramebufferToTexture=capture;mesh.onBeforeRender(f.renderer,options.targetScene,options.passCamera);assert.equal(f.copies.length,0);assert.equal(f.glow.render(),true);assert.equal(f.copies.length,1);
 }finally{f.glow.dispose();}
});


test('glow uses the same fullscreen camera through WebGPU projection update and drawing',async()=>{
 const f=fixture();try{
  f.glow.render();await turn();const camera=f.deferred[0].options.passCamera;
  // Renderer._renderScene changes coordinate systems on first WebGPU draw.
  // Use the real camera method: a base THREE.Camera throws here.
  camera.coordinateSystem=THREE.WebGPUCoordinateSystem;
  assert.doesNotThrow(()=>camera.updateProjectionMatrix());
  camera.updateMatrixWorld();
  assert.equal(camera.isOrthographicCamera,true);
  const near=new THREE.Vector3(-1,1,0).project(camera),far=new THREE.Vector3(1,-1,-1).project(camera);
  assert(near.distanceTo(new THREE.Vector3(-1,1,0))<1e-12);
  assert(far.distanceTo(new THREE.Vector3(1,-1,1))<1e-12);
  assert(new THREE.Vector3(.25,-.5,-.75).project(camera).unproject(camera).distanceTo(new THREE.Vector3(.25,-.5,-.75))<1e-12);
  f.deferred[0].resolve({valid:()=>true});await turn();
  assert.equal(f.glow.render(),true);assert.equal(f.glow.render(),true);
  assert.equal(f.draws[0].camera,camera);assert.equal(f.draws[1].camera,camera);
  assert.equal(f.deferred.length,1);assert.equal(f.copies.length,2);assert.deepEqual(f.errors,[]);
 }finally{f.glow.dispose();}
});
