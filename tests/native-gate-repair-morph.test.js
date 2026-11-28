import {floorFloat32} from '../src/rendering/float32-time.js';
import {uniform} from 'three/tsl';
import {recordWallPresentation,wallVisualAt} from '../src/simulation/structure-presentation.js';
import {captureNativeRoutePickFrame} from '../src/rendering/native-route-pick-frame.js';
import {setup as farmHost,admit as admitFarm,present as presentFarm} from '../tests/helpers/native-farm-arrival-remote.js';
import {flush} from '../tests/helpers/remote-webgpu-fixture.js';
import RenderObject from 'three/src/renderers/common/RenderObject.js';
import WebGPUAttributeUtils from 'three/src/renderers/webgpu/utils/WebGPUAttributeUtils.js';
import {BufferAttribute,DataTexture} from 'three';
import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync} from 'node:fs';
import {BufferGeometry,Mesh,Matrix4,DoubleSide,Vector3,Raycaster,Scene,PerspectiveCamera} from 'three';
import {MeshStandardNodeMaterial,WebGPURenderer} from 'three/webgpu';
import {NativeWall} from '../src/rendering/walls.js';
import {morphedWallPositions} from '../src/rendering/walls-native.js';
import {createNativeGateGpuBinding} from '../src/rendering/native-gate-gpu-binding.js';
import {createNativeGateGpuClock} from '../src/rendering/native-gate-gpu-clock.js';
import {createWebGpuAdmittedWall} from '../src/rendering/webgpu-wall-admission.js';
import {nativeGateCrossingFixture} from '../tests/helpers/native-gate-crossings.js';
const turn=()=>new Promise(resolve=>setImmediate(resolve));
const pack=JSON.parse(readFileSync('public/content/walls.json'));
function assets(material,suffixes=['puerta','destruido']){const array=(d,T)=>{const b=readFileSync('public'+d.url);return new T(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength));};
 return Object.fromEntries(suffixes.map(suffix=>{const key=material+'_'+suffix,p=pack.pieces[key],piece={p:array(p.p,Float32Array),n:array(p.n,Float32Array),uv:array(p.uv,Float32Array),i:array(p.i,Uint16Array),faceRegions:array(p.faceRegions,Uint16Array),regions:p.regions,morph:Object.fromEntries(Object.entries(p.morph).map(([key,m])=>[key,{p:array(m.p,Float32Array),n:array(m.n,Float32Array),peers:m.peers}]))};
  const mesh=new Mesh(new BufferGeometry(),new MeshStandardNodeMaterial({side:DoubleSide}));mesh.userData.nativePiece=piece;return [key,mesh];}));}
async function fixture(material='zarzas',restore=false){
 const yaw=.37,turnPoint=(x,z)=>[x*Math.cos(yaw)+z*Math.sin(yaw),-x*Math.sin(yaw)+z*Math.cos(yaw)];
 const native=nativeGateCrossingFixture({materials:[material],yaw}),request=native.route({origin:turnPoint(.05,-6),points:[turnPoint(.05,6)]}),admitted=native.admit(request);assert.equal(admitted.status,'admitted');
 const captured=native.bridge.captureNativeRoutePresentation(admitted.routeHandle).gates[0],gate={...captured,nativeRoute:undefined,worldBoundary:{version:1,authorityEpoch:'damage-test',nativeSession:1,ticket:3,effectiveTime:captured.startTime}},motion=createNativeGateGpuClock(gate),entity={...native.gates[0],hp:30,maxHp:60};
 if(restore){entity.hp=60;entity.gateOpen=1;entity.wallPresentation={from:.5,to:1,at:17.25};}
 const proto=assets(material),requests=[],releases=[],errors=[];
 const pipelineAdmission={prepare(object,{signal}){return new Promise((resolve,reject)=>{requests.push({object,signal,resolve,reject});signal.addEventListener('abort',()=>reject(new DOMException('cancel','AbortError')),{once:true});});},deferRelease(object,done){releases.push({object,done});}};
 const presentationClock=uniform(restore?17.4:10);let displayTime=restore?17.4:10;
 const view=createWebGpuAdmittedWall({prototypes:proto,entity,elapsed:restore?17.4:10,pipelineAdmission,presentationClock,getPresentationTime:()=>displayTime,onError:e=>errors.push(e)});await turn();requests[0].resolve();await turn();
 const wall=view.group.children.find(v=>v.visible);assert(wall);new Matrix4().fromArray(gate.rootMatrix).decompose(view.group.position,view.group.quaternion,view.group.scale);view.group.scale.divide(wall.scale);view.group.updateMatrixWorld(true);
 let at=gate.startTime;return {native,view,wall,gate,motion,entity,requests,releases,errors,presentationClock,set displayTime(v){displayTime=v;},set time(v){at=v;},getPickTime:()=>at,
  bind(){return view.prepareNativeGate({presentation:gate,motion,getPickTime:()=>at});},
  close(){view.dispose();for(const r of releases.splice(0))r.done();for(const p of Object.values(proto)){p.geometry.dispose();p.material.dispose();}native.session.dispose();}};
}
for(const material of ['zarzas','empalizada','reforzado'])test(`${material}: Repair retains both admitted stages for the original 480 ms curve before deferred replacement`,async()=>{
 const f=await fixture(material);try{
  const p=f.bind();assert.equal(p.request.options.include.length,2);p.activate();p.finalize();
  const old=f.wall,binding=old.nativeGpuGate,geometries=old.parts.map(p=>p.mesh.geometry),materials=old.parts.map(p=>p.mesh.material),motor=f.motion.clockNode,versions=geometries.map(g=>Object.values(g.attributes).map(a=>a.version));
  const entity={...f.entity,hp:60};recordWallPresentation(entity,.5,17.4);
  for(const age of [0,.05,.12,.24,.36,.47]){
   const at=17.4+age;f.displayTime=at;f.presentationClock.value=at;f.view.update(entity,at);
   assert.equal(f.requests.length,1);assert.equal(f.wall.nativeGpuGate,binding);assert(binding.current());assert.equal(f.motion.clockNode,motor);assert.equal(f.wall.parts.length,2);
   assert.deepEqual(old.parts.map(p=>p.mesh.geometry),geometries);assert.deepEqual(old.parts.map(p=>p.mesh.material),materials);
   assert.deepEqual(geometries.map(g=>Object.values(g.attributes).map(a=>a.version)),versions,'no per-frame vertex uploads');
   assert(geometries.every(g=>g.attributes.wgMorphPosition.data.version===0),'no packed basis uploads after creation');
   const visual=wallVisualAt(entity,at);assert(Math.abs(binding.repairLayer.sample(at)-visual)<2e-6);
   for(let i=0;i<2;i++){
    const bridge=old.parts[i].bridge,expected=morphedWallPositions(bridge,i===0?1-visual:visual);
    for(let k=0;k<expected.length/3;k+=31){const actual=binding.repairLayer.position(i,k,new Vector3());assert(actual.distanceTo(new Vector3().fromArray(expected,k*3))<2e-5,`stage ${i} at ${age}`);}
   }
  }
  assert.throws(()=>f.view.update({...entity,wallPresentation:{...entity.wallPresentation,at:18}},17.87),/prepared geometry/);
  assert.throws(()=>old.update({...entity,hp:20},undefined,17.87),/prepared geometry/);
  let disposed=0;geometries.forEach(g=>g.addEventListener('dispose',()=>disposed++));
  f.view.update(entity,17.9);await turn();const next=f.requests[1].object;assert.equal(next.parts.length,1);assert.equal(next.visible,false);assert.equal(old.visible,true);assert(next.nativeGpuGate.current());
  f.requests[1].resolve();await turn();assert.equal(next.visible,true);assert.equal(disposed,0);assert.equal(f.motion.clockNode,motor);
  for(const r of f.releases.splice(0))r.done();assert.equal(disposed,2);assert(next.nativeGpuGate.current());assert.equal(f.errors.length,0);
 }finally{f.close();}
});
test('picking consumes the submitted morph time while authority is ahead, and pause keeps both shapes fixed',async()=>{
 const f=await fixture();try{
  const p=f.bind();p.activate();p.finalize();const b=f.wall.nativeGpuGate,entity={...f.entity,hp:60};recordWallPresentation(entity,.5,17.4);f.view.update(entity,17.45);
  const captured=captureNativeRoutePickFrame({nativeRouteFrame:{sequence:1,clockElapsed:25,presentationElapsed:Math.fround(17.5),bindings:[]}});
  f.displayTime=captured.getPresentationTime();f.presentationClock.value=100;
  const root=new Matrix4().fromArray(f.gate.rootMatrix),hinge=new Vector3().fromArray(f.gate.hinge),rotation=new Matrix4().makeRotationY(-b.sampleOpening(f.gate.startTime)*Math.PI/2);
  for(let partIndex=0;partIndex<2;partIndex++){
   const part=f.wall.parts[partIndex],shape=b.repairLayer,mesh=part.mesh;let checked=false;
   for(let k=0;k<part.bridge.pos.length/3;k+=3){
    const vertices=[0,1,2].map(j=>{const point=shape.position(partIndex,k+j,new Vector3());if(partIndex===0&&f.gate.leafFlags[k+j])point.sub(hinge).applyMatrix4(rotation).add(hinge);return point.applyMatrix4(root);});
    const normal=vertices[1].clone().sub(vertices[0]).cross(vertices[2].clone().sub(vertices[0]));if(normal.lengthSq()<1e-8)continue;normal.normalize();const center=vertices[0].clone().add(vertices[1]).add(vertices[2]).multiplyScalar(1/3);
    for(let repeat=0;repeat<2;repeat++){const hits=[];mesh.raycast(new Raycaster(center.clone().addScaledVector(normal,.01),normal.clone().negate()),hits);assert(hits.some(hit=>hit.point.distanceTo(center)<3e-5));}checked=true;break;
   }assert(checked);
  }
  const without=captureNativeRoutePickFrame({nativeRouteFrame:{sequence:1,clockElapsed:25,bindings:[]}});assert.throws(()=>without.getPresentationTime(),/submitted/);
  for(const bad of [NaN,-1,26,17.123456789])assert.throws(()=>captureNativeRoutePickFrame({nativeRouteFrame:{sequence:1,clockElapsed:25,presentationElapsed:bad,bindings:[]}}),/presentation clock/);
 }finally{f.close();}
});
test('both real morph materials build WGSL before Repair and rollback restores the original owners',async()=>{
 const f=await fixture(),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;renderer.backend.renderer=renderer;
 try{const original=f.wall.parts.map(p=>p.mesh.material),part=f.bind();part.activate();const binding=f.wall.nativeGpuGate;
  for(const {mesh} of binding.materialAlternatives){const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=new Scene();builder.camera=new PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/wgMorphTarget/);assert.match(builder.vertexShader,/wgMorphNormal/);assert.match(builder.vertexShader,/sqrt/);const bases=new Set(['Position','Normal','Root','Peer','Target','TargetNormal'].map(name=>mesh.geometry.attributes['wgMorph'+name].data));assert.equal(bases.size,1,'one vertex buffer for the six morph fields');assert(!bases.has(undefined));const buffers=new Set(builder.attributes.map(a=>a.node?.attribute?.data??a.node?.attribute??mesh.geometry.getAttribute(a.name)?.data??mesh.geometry.getAttribute(a.name)).filter(Boolean));assert(buffers.size<=8,'default WebGPU vertex buffer limit');}
  part.rollback();assert.deepEqual(f.wall.parts.map(p=>p.mesh.material),original);part.cancel();for(const r of f.releases.splice(0))r.done();assert.deepEqual(f.wall.parts.map(p=>p.mesh.material),original);
 }finally{f.close();}
});
test('failed final topology admission retains the completed morph and cancellation retires only the hidden candidate',async()=>{
 const f=await fixture();try{const p=f.bind();p.activate();p.finalize();const b=f.wall.nativeGpuGate,entity={...f.entity,hp:60};recordWallPresentation(entity,.5,17.4);f.view.update(entity,17.45);f.view.update(entity,17.9);await turn();const candidate=f.requests[1].object;f.requests[1].reject(Error('denied'));await turn();assert(b.current());assert.equal(candidate.parent,null);for(const r of f.releases.splice(0))r.done();assert(b.current());assert.equal(b.repairLayer.sample(18),1);assert.equal(f.errors.length,1);}finally{f.close();}
});
test('real Host reports the actual clamped global uniform, pause, and failed submit never publish a later pick time',async()=>{
 const f=await farmHost();try{
  const ceiling=f.state.elapsed+.1;f.clock={...f.clock,safeUntil:ceiling};f.client.registerClockBinding(f.buffer,{byteOffset:8,semantic:'absolute',epoch:0});
  const preparation=admitFarm(f),result=await preparation.promise;assert.equal(result.status,'committed',JSON.stringify(result));await presentFarm(f,preparation);
  f.advance(.3);await flush();f.host.present();
  const status=f.host.inspect(),value=new Float32Array(f.gpu.buffers[0].data.buffer)[2],pick=captureNativeRoutePickFrame(status);
  assert.equal(pick.getPresentationTime(),value);assert(status.nativeRouteFrame.clockElapsed>value);assert(value<=ceiling);
  f.host.present();assert.equal(captureNativeRoutePickFrame(f.host.inspect()).getPresentationTime(),value,'a stationary confirmed clock remains stationary');
  const before=f.host.inspect().nativeRouteFrame;f.advance(.1);await flush();f.gpu.device.queue.submit=()=>{throw Error('intentional failed submit');};f.host.present();
  assert.deepEqual(f.host.inspect().nativeRouteFrame,before);assert.equal(f.host.inspect().failed,true);assert.throws(()=>captureNativeRoutePickFrame(f.host.inspect()),/unavailable/);
 }finally{await f.close();}
});
test('the real Repair event can begin without replacing the admitted damage owner',async()=>{
 const f=await fixture();try{const p=f.bind();p.activate();p.finalize();const entity={...f.entity,hp:60};recordWallPresentation(entity,.5,17.4);f.view.update(entity,17.45);assert.equal(f.view.parts.length,2);assert(f.wall.nativeGpuGate.current());}finally{f.close();}
});
test('a new motor binding borrows the same Repair policy, rollback and retirement preserve the live owner',async()=>{
 const f=await fixture();try{
  const first=f.bind();first.activate();first.finalize();const old=f.wall.nativeGpuGate,entity={...f.entity,hp:60};recordWallPresentation(entity,.5,17.4);f.view.update(entity,17.5);
  const originalMaterials=f.wall.parts.map(p=>p.mesh.material),second=f.bind();second.activate();const next=f.wall.nativeGpuGate;assert.equal(next.repairLayer.policy,old.repairLayer.policy);
  second.rollback();assert.equal(f.wall.nativeGpuGate,old);assert(old.current());assert.deepEqual(f.wall.parts.map(p=>p.mesh.material),originalMaterials);
  second.activate();second.finalize();for(const r of f.releases.splice(0))r.done();assert(next.current());assert.equal(next.repairLayer.sample(17.88),1);f.view.update(entity,17.6);assert(next.current());
 }finally{f.close();}
});
test('Three r180 effective vertex layouts keep the textured colored leaf and debris below eight buffers',async()=>{
 const f=await fixture(),texture=new DataTexture(new Uint8Array([255,255,255,255]),1,1),canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;renderer.backend.renderer=renderer;
 try{
  for(const {mesh}of f.wall.parts){mesh.geometry.setAttribute('color',new BufferAttribute(new Float32Array(mesh.geometry.attributes.position.count*3).fill(1),3));mesh.material.map=texture;mesh.material.vertexColors=true;}
  const p=f.bind();p.activate();const counts=[];
  for(const {mesh}of f.wall.nativeGpuGate.materialAlternatives){
   const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=new Scene();builder.camera=new PerspectiveCamera();builder.build();
   const renderObject={attributes:null,geometry:mesh.geometry,getNodeBuilderState:()=>({nodeAttributes:builder.attributes}),getAttributes:RenderObject.prototype.getAttributes},layouts=new WebGPUAttributeUtils(renderer.backend).createShaderVertexBuffers(renderObject);
   counts.push(layouts.length);assert(layouts.length>0&&layouts.length<=8,`effective layouts ${layouts.length} exceed eight buffers`);
   assert(layouts.some(l=>l.arrayStride===72&&l.attributes.length===6&&l.attributes.map(a=>a.offset).sort((a,b)=>a-b).join(',')==='0,12,24,36,48,60'),'all morph fields share the actual stride/offset layout');
   assert.match(builder.vertexShader,/color/);assert.match(builder.vertexShader,/uv/);
  }console.log('Effective Three r180 vertex buffer counts: '+counts.join('/'));p.cancel();
 }finally{f.close();texture.dispose();}
});

const versions=wall=>wall.parts.map(({mesh})=>Object.entries(mesh.geometry.attributes).map(([name,a])=>[name,a.version,a.data?.version]));
for(const material of ['zarzas','empalizada','reforzado'])test(`${material}: restore installs the original Repair curve before first admission without vertex writes`,async()=>{
 const f=await fixture(material,true);
 try{
  const b=f.wall.nativeGpuRepair;assert(b,'restored morph owner must exist before any route preparation');assert(b.current());assert.equal(f.wall.nativeGpuGate,undefined,'no invented motor');
  assert.deepEqual(b.repairLayer.policy.event,f.entity.wallPresentation);assert.equal(b.repairLayer.policy.node.value.z,17.25);
  const initialVersions=versions(f.wall),geometries=f.wall.parts.map(p=>p.mesh.geometry),materials=f.wall.parts.map(p=>p.mesh.material),original=structuredClone(f.entity);
  for(const at of [17.4,17.4,17.45,17.55,17.65,17.729]){
   f.displayTime=at;f.presentationClock.value=at;f.view.update(f.entity,at);
   assert(b.current());assert.equal(f.requests.length,1);assert.deepEqual(versions(f.wall),initialVersions);
   assert.deepEqual(f.wall.parts.map(p=>p.mesh.geometry),geometries);assert.deepEqual(f.wall.parts.map(p=>p.mesh.material),materials);
   const visual=wallVisualAt(f.entity,at);assert(Math.abs(b.repairLayer.sample(at)-visual)<2e-6);
   for(let part=0;part<2;part++){
    const expected=morphedWallPositions(f.wall.parts[part].bridge,part===0?1-visual:visual);
    for(let k=0;k<expected.length/3;k+=71)assert(b.repairLayer.position(part,k,new Vector3()).distanceTo(new Vector3().fromArray(expected,k*3))<2e-5);
   }
  }
  assert.deepEqual(f.entity,original,'no event, HP or economics replay');
  const canvas={width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}},renderer=new WebGPURenderer({canvas});renderer.hasFeature=()=>true;renderer.backend.renderer=renderer;
  for(const {mesh} of f.wall.parts){const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=new Scene();builder.camera=new PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/wgMorphTarget/);assert.match(builder.vertexShader,/wgMorphNormal/);}
  let disposed=0;geometries.forEach(g=>g.addEventListener('dispose',()=>disposed++));
  f.view.update(f.entity,17.731);await turn();assert.equal(f.requests.length,2);const healthy=f.requests[1].object;
  assert.equal(healthy.parts.length,1);assert.equal(healthy.visible,false);assert(b.current());
  f.requests[1].resolve();await turn();assert.equal(healthy.visible,true);assert.equal(disposed,0);
  for(const r of f.releases.splice(0))r.done();assert.equal(disposed,2);assert.equal(f.errors.length,0);
 }finally{f.close();}
});
test('restore rejects a changed curve, motor or owner and keeps the admitted shape if final preparation fails',async()=>{
 const f=await fixture('zarzas',true);try{
  const b=f.wall.nativeGpuRepair;assert(b);const before=versions(f.wall);
  for(const changed of [{gateOpen:.5},{hp:30},{wallPresentation:{...f.entity.wallPresentation,at:17.3}},{id:'other'}])assert.throws(()=>f.view.update({...f.entity,...changed},17.5),/prepared geometry|motor transition/);
  assert.deepEqual(versions(f.wall),before);assert(b.current());
  f.view.update(f.entity,17.74);await turn();f.requests[1].reject(Error('intentional refusal'));await turn();
  for(const r of f.releases.splice(0))r.done();assert(b.current());assert.equal(b.repairLayer.sample(18),1);assert.equal(f.errors.length,1);
 }finally{f.close();}
});
test('a real prepared gate motor inherits the restored curve, with rollback and deferred retirement',async()=>{
 const f=await fixture('zarzas',true);try{
  const b=f.wall.nativeGpuRepair;assert(b);const originalMaterials=f.wall.parts.map(p=>p.mesh.material),before=versions(f.wall);
  const p=f.bind();p.activate();const motor=f.wall.nativeGpuGate;assert(motor.current());assert.equal(motor.repairLayer.policy,b.repairLayer.policy);
  p.rollback();assert.equal(f.wall.nativeGpuGate,null);assert(b.current());assert.deepEqual(f.wall.parts.map(p=>p.mesh.material),originalMaterials);
  p.activate();p.finalize();for(const r of f.releases.splice(0))r.done();assert(motor.current());assert.equal(f.wall.nativeGpuRepair,null);assert.deepEqual(versions(f.wall),before);
  f.view.update(f.entity,17.5);assert.equal(motor.repairLayer.policy.event.at,17.25);
 }finally{f.close();}
});
test('restored picking samples the submitted clock and fixed saved opening',async()=>{
 const f=await fixture('zarzas',true);try{
  const b=f.wall.nativeGpuRepair;assert(b);f.displayTime=17.4;f.presentationClock.value=50;
  const mesh=f.wall.parts[0].mesh,bridge=f.wall.parts[0].bridge,[hx,hz]=bridge.leaf.hinge,hinge=new Vector3(hx,0,hz),rotation=new Matrix4().makeRotationY(-Math.PI/2);
  let hit=false;
  for(let k=0;k<bridge.pos.length/3;k+=3){
   const points=[0,1,2].map(j=>{const out=b.repairLayer.position(0,k+j,new Vector3());if(bridge.leafFlags[k+j])out.sub(hinge).applyMatrix4(rotation).add(hinge);return out.applyMatrix4(mesh.matrixWorld);});
   const n=points[1].clone().sub(points[0]).cross(points[2].clone().sub(points[0]));if(n.lengthSq()<1e-8)continue;n.normalize();const center=points[0].clone().add(points[1]).add(points[2]).multiplyScalar(1/3),hits=[];
   mesh.raycast(new Raycaster(center.clone().addScaledVector(n,.01),n.clone().negate()),hits);assert(hits.some(h=>h.point.distanceTo(center)<3e-5));hit=true;break;
  }assert(hit);
 }finally{f.close();}
});
test('restored Repair cannot silently fall back to CPU when the submitted clock is unavailable',()=>{
 const proto=assets('zarzas'),entity={id:'structure-1000000',material:'zarzas',gate:true,status:'intact',hp:60,maxHp:60,gateOpen:1,wallPresentation:{from:.5,to:1,at:17.25}};
 try{assert.throws(()=>createWebGpuAdmittedWall({prototypes:proto,entity,elapsed:17.4,pipelineAdmission:{prepare(){throw Error('unexpected admission');}}}),/submitted presentation clock/);}
 finally{for(const p of Object.values(proto)){p.geometry.dispose();p.material.dispose();}}
});

{
const template={kind:'native-barrier-addition-reference',version:1,worldBoundary:{version:1,authorityEpoch:'ruin-test',nativeSession:1,ticket:3,effectiveTime:17},sourceControlSequence:1,additions:[{entityId:'structure-749',x:0,z:0,halfX:1,halfZ:1,yaw:0,passMask:0}]};
const proof={kind:'native-barrier-addition-attestation',version:1,preparedReference:template,reference:{...template,worldBoundary:{...template.worldBoundary,ticket:4,effectiveTime:18}},nativeIds:[77]};
for(const material of ['zarzas','empalizada','adobe','piedra','reforzado'])test(`${material}: ruin replacement prepares every original phase before READY and retains them through the canonical 480ms`,async()=>{
 const proto=assets(material,['intacto','danado','destruido']),entity={id:'structure-749',kind:'wall',material,gate:false,hp:0,maxHp:100,status:'ruined',collapseRemaining:0},healthy={...entity,hp:100,status:'intact'},requests=[],releases=[];
 let at=17,pick;const clock=uniform(at),pipelineAdmission={prepare(object){return new Promise((resolve,reject)=>requests.push({object,resolve,reject}));},deferRelease(object,release){releases.push(release);}};
 const view=createWebGpuAdmittedWall({prototypes:proto,entity,elapsed:at,pipelineAdmission,presentationClock:clock,getRepairAge:reference=>pick.getBarrierRepairElapsed(reference),getPresentationTime:()=>17});
 try{
  await turn();requests[0].resolve();await turn();const ruin=view.group.children.find(x=>x.visible),initialGeometry=ruin.parts[0].mesh.geometry;
  assert.equal(typeof view.prepareNativeRepair,'function');const p=view.prepareNativeRepair({entity:healthy,elapsed:at,signal:new AbortController().signal,template}),wall=p.object;
  assert.equal(wall.parts.length,4);assert.equal(ruin.visible,true);assert.equal(wall.visible,false);assert(p.valid());
  for(const part of wall.parts)assert.equal(part.mesh.material.userData.blessingObject,wall.blessingUniform,'both authored pairs consume the resident root uniform');
  const renderer=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});renderer.hasFeature=()=>true;renderer.backend.renderer=renderer;
  for(const {mesh} of wall.parts){const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=new Scene();builder.camera=new PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/wgMorphTarget/);}
  wall.nativeGpuRepair.acceptBoundary(proof);p.activate();p.attach();const final=p.finalize();final.retire();final.notify();
  const versions=()=>wall.parts.map(({mesh})=>Object.values(mesh.geometry.attributes).map(a=>[a.version,a.data?.version])),v=versions(),identities=wall.parts.map(p=>[p.mesh.geometry,p.mesh.material]);
  const current={...healthy,wallPresentation:{from:0,to:1,at:18}};
  for(const age of [0,.02,.08,.1,.2,.4,.479]){
   at=18+age;clock.value=17;const submittedAge=floorFloat32(at-18);pick=captureNativeRoutePickFrame({nativeRouteFrame:{sequence:1,clockElapsed:at,presentationElapsed:17,worldBoundary:proof.reference.worldBoundary,bindings:[{nativeBarrierAddition:template,nativeBarrierAdditionBinding:proof,semantic:'relative',epoch:17,executionEpoch:18,relativeTime:submittedAge,elapsed:18+submittedAge}]}});view.update(current,at);assert.equal(requests.length,1);assert.deepEqual(versions(),v);assert.deepEqual(wall.parts.map(p=>[p.mesh.geometry,p.mesh.material]),identities);
   if(age===.1){
    wall.updateMatrixWorld(true);const mesh=wall.parts[3].mesh,index=mesh.geometry.index;
    let hit=false;
    for(let k=0;k<(index?.count??mesh.geometry.attributes.position.count)&&!hit;k+=3){
     const triangle=[0,1,2].map(offset=>wall.nativeGpuRepair.repairLayer.position(3,(index?index.getX(k+offset):k+offset),new Vector3()).applyMatrix4(mesh.matrixWorld)),[a,b,c]=triangle,normal=new Vector3().subVectors(b,a).cross(new Vector3().subVectors(c,a));if(normal.lengthSq()<1e-10)continue;
     normal.normalize();const center=a.clone().add(b).add(c).divideScalar(3),hits=[];mesh.raycast(new Raycaster(center.clone().addScaledVector(normal,2),normal.clone().negate()),hits);hit=hits.some(h=>h.point.distanceTo(center)<1e-4);
    }
    assert(hit,'raycast uses the submitted second-pair geometry while the global clock remains frozen');
   }
   const visual=wallVisualAt(current,pick.getBarrierRepairExecutionTime(template)),start=visual<=.5?0:2,local=start===0?visual*2:visual*2-1;
   for(let i=0;i<4;i++)for(let k=0;k<wall.parts[i].bridge.pos.length/3;k+=109){const actual=wall.nativeGpuRepair.repairLayer.position(i,k,new Vector3());if(i<start||i>=start+2)assert.equal(actual.length(),0);else{const expected=morphedWallPositions(wall.parts[i].bridge,i%2===0?1-local:local);assert(actual.distanceTo(new Vector3().fromArray(expected,k*3))<2e-5);}}
  }
  at=18.5;view.update(current,at);await turn();assert.equal(requests.length,2);assert.equal(requests[1].object.parts.length,1);assert(wall.nativeGpuRepair.current());requests[1].resolve();await turn();for(const release of releases.splice(0))release();
  assert.equal(view.parts.length,1);assert.notEqual(view.parts[0].mesh.geometry,initialGeometry);
 }finally{view.dispose();for(const release of releases.splice(0))release();for(const p of Object.values(proto)){p.geometry.dispose();p.material.dispose();}}
});

}

for(const material of ['zarzas','empalizada','adobe','piedra','reforzado'])for(const savedAge of [.05,.10])test(`${material}: cold solid Repair resumes age ${savedAge} without CPU geometry or a new boundary`,async()=>{
 const proto=assets(material,['intacto','danado','destruido']),entity={id:'structure-749',kind:'wall',material,gate:false,hp:100,maxHp:100,status:'intact',wallPresentation:{from:0,to:1,at:17.25}},original=structuredClone(entity),requests=[],releases=[],errors=[];
 let submitted=17.25+savedAge;const clock=uniform(submitted),pipelineAdmission={prepare(object){return new Promise((resolve,reject)=>requests.push({object,resolve,reject}));},deferRelease(object,release){releases.push(release);}};
 const view=createWebGpuAdmittedWall({prototypes:proto,entity,elapsed:submitted,pipelineAdmission,presentationClock:clock,getPresentationTime:()=>submitted,getRepairAge:()=>floorFloat32(Math.min(.48,submitted-17.25)),onError:e=>errors.push(e)});
 try{
  await turn();const wall=requests[0].object,owner=wall.nativeGpuRepair;assert(owner,'cold solid Repair must acquire a GPU morph owner before its first admission');assert(owner.current());assert.equal(wall.parts.length,4);assert.equal(wall.nativeGpuGate,undefined);assert.equal(owner.clockNode[Symbol.for('wild-guardians.remote-clock')].nativeRestoredWallRepair.kind,'restored-wall-repair-reference');
  assert.deepEqual(owner.repairLayer.policy.event,entity.wallPresentation);assert.equal(owner.repairLayer.policy.node.value.z,17.25);
  const root=view.group,v=versions(wall),ids=wall.parts.map(p=>[p.mesh.geometry,p.mesh.material]);assert(wall.parts.every(p=>p.mesh.material.userData.blessingObject===wall.blessingUniform));requests[0].resolve();await turn();
  const compare=()=>{
   const visual=wallVisualAt(entity,submitted),start=visual<=.5?0:2,local=start===0?visual*2:visual*2-1;
   assert(Math.abs(owner.repairLayer.sample(submitted)-visual)<1e-8);
   for(let i=0;i<4;i++){
    const expected=morphedWallPositions(wall.parts[i].bridge,i%2===0?1-local:local);
    for(let k=0;k<expected.length/3;k+=109){const actual=owner.repairLayer.position(i,k,new Vector3());if(i<start||i>=start+2)assert.equal(actual.length(),0);else assert(actual.distanceTo(new Vector3().fromArray(expected,k*3))<2e-5);}
   }
   return start;
  };
  compare();const pinned=owner.repairLayer.position(savedAge<.099?1:3,0,new Vector3());clock.value=100;view.update(entity,submitted);assert.deepEqual(owner.repairLayer.position(savedAge<.099?1:3,0,new Vector3()),pinned,'pause/picking use submitted time, not a newer CPU clock');
  for(const age of [savedAge,.12,.24,.47]){submitted=17.25+age;clock.value=submitted;view.update(entity,submitted);compare();assert(owner.current());assert.equal(requests.length,1);assert.deepEqual(versions(wall),v);assert.deepEqual(wall.parts.map(p=>[p.mesh.geometry,p.mesh.material]),ids);}
  submitted=17.25+savedAge;wall.updateMatrixWorld(true);const active=compare(),mesh=wall.parts[active+1].mesh;let hit=false;
  for(let k=0;k<mesh.geometry.attributes.position.count&&!hit;k+=3){const points=[0,1,2].map(j=>owner.repairLayer.position(active+1,k+j,new Vector3()).applyMatrix4(mesh.matrixWorld)),[a,b,c]=points,n=b.clone().sub(a).cross(c.clone().sub(a));if(n.lengthSq()<1e-10)continue;n.normalize();const center=a.clone().add(b).add(c).divideScalar(3),hits=[];mesh.raycast(new Raycaster(center.clone().addScaledVector(n,1),n.clone().negate()),hits);hit=hits.some(h=>h.point.distanceTo(center)<1e-4);}assert(hit,'raycast agrees at the saved side of the pair crossing');
  for(const change of [{wallPresentation:{...entity.wallPresentation,at:17.26}},{hp:99},{id:'foreign-owner'}])assert.throws(()=>view.update({...entity,...change},17.5),/prepared geometry transition/);assert(owner.current());assert.deepEqual(versions(wall),v);
  if(savedAge===.10){const renderer=new WebGPURenderer({canvas:{width:1,height:1,style:{},addEventListener(){},removeEventListener(){},getContext(){return null;}}});renderer.hasFeature=()=>true;renderer.backend.renderer=renderer;for(const {mesh} of wall.parts){const builder=renderer.backend.createNodeBuilder(mesh,renderer);builder.scene=new Scene();builder.camera=new PerspectiveCamera();builder.build();assert.match(builder.vertexShader,/wgMorphTarget/);}}
  let disposed=0;ids.forEach(([g])=>g.addEventListener('dispose',()=>disposed++));submitted=17.74;view.update(entity,submitted);await turn();assert.equal(requests.length,2);assert(owner.current());assert.equal(disposed,0);assert.equal(requests[1].object.parts.length,1);requests[1].resolve();await turn();assert.equal(view.group,root);assert.equal(disposed,0);for(const release of releases.splice(0))release();assert.equal(disposed,4);assert.equal(view.parts.length,1);assert.deepEqual(errors,[]);assert.deepEqual(entity,original);
 }finally{view.dispose();for(const release of releases.splice(0))release();for(const p of Object.values(proto)){p.geometry.dispose();p.material.dispose();}}
});

test('cold solid Repair refuses a missing submitted clock before any graphical admission',()=>{
 const proto=assets('zarzas',['intacto','danado','destruido']),entity={id:'structure-749',kind:'wall',material:'zarzas',gate:false,hp:100,maxHp:100,status:'intact',wallPresentation:{from:0,to:1,at:17.25}};
 try{assert.throws(()=>createWebGpuAdmittedWall({prototypes:proto,entity,elapsed:17.35,getRepairAge:()=>.1,pipelineAdmission:{prepare(){throw Error('unexpected admission');}}}),/submitted presentation clock/);}finally{for(const p of Object.values(proto)){p.geometry.dispose();p.material.dispose();}}
});

test('cold solid Repair cancellation retires only owned geometry and late completion cannot publish',async()=>{
 const proto=assets('zarzas',['intacto','danado','destruido']),entity={id:'structure-749',kind:'wall',material:'zarzas',gate:false,hp:100,maxHp:100,status:'intact',wallPresentation:{from:0,to:1,at:17.25}},releases=[],requests=[],errors=[],clock=uniform(17.35);
 const pipelineAdmission={prepare(object){return new Promise((resolve,reject)=>requests.push({object,resolve,reject}));},deferRelease(object,release){releases.push(release);}};
 const make=prepareInitial=>createWebGpuAdmittedWall({prototypes:proto,entity,elapsed:17.35,pipelineAdmission,presentationClock:clock,getPresentationTime:()=>17.35,getRepairAge:()=>floorFloat32(.1),prepareInitial,onError:e=>errors.push(e)});
 const first=make(true),second=make(true);let pending;
 try{
  const a=first.initialParticipant.object,b=second.initialParticipant.object,other=b.parts[0].mesh.geometry,owned=a.parts[0].mesh.geometry;let otherDisposed=0,ownedDisposed=0;other.addEventListener('dispose',()=>otherDisposed++);owned.addEventListener('dispose',()=>ownedDisposed++);
  assert(a.nativeGpuRepair.current());assert(b.nativeGpuRepair.current());assert.notEqual(owned,other);
  a.parts[0].mesh.geometry=other;assert.equal(a.nativeGpuRepair.current(),false,'foreign alias must invalidate the owner');first.initialParticipant.cancel();assert.equal(ownedDisposed,0);for(const release of releases.splice(0))release();assert.equal(ownedDisposed,1);assert.equal(otherDisposed,0);assert(b.nativeGpuRepair.current());
  pending=make(false);await turn();assert.equal(requests.length,1);const candidate=requests[0].object;pending.dispose();requests[0].resolve();await turn();for(const release of releases.splice(0))release();assert.equal(pending.parts.length,0);assert.equal(candidate.parent,null);assert(b.nativeGpuRepair.current());assert.deepEqual(errors,[]);
 }finally{first.dispose();second.dispose();pending?.dispose();for(const release of releases.splice(0))release();for(const p of Object.values(proto)){p.geometry.dispose();p.material.dispose();}}
});

test('cold solid Repair keeps the submitted owner when final healthy preparation is rejected',async()=>{
 const proto=assets('zarzas',['intacto','danado','destruido']),entity={id:'structure-749',kind:'wall',material:'zarzas',gate:false,hp:100,maxHp:100,status:'intact',wallPresentation:{from:0,to:1,at:17.25}},requests=[],releases=[],errors=[],clock=uniform(17.35);let submitted=17.35;
 const view=createWebGpuAdmittedWall({prototypes:proto,entity,elapsed:submitted,presentationClock:clock,getPresentationTime:()=>submitted,getRepairAge:()=>floorFloat32(Math.min(.48,submitted-17.25)),pipelineAdmission:{prepare(object){return new Promise((resolve,reject)=>requests.push({object,resolve,reject}));},deferRelease(object,release){releases.push(release);}},onError:e=>errors.push(e)});
 try{await turn();requests[0].resolve();await turn();const wall=requests[0].object,owner=wall.nativeGpuRepair,v=versions(wall);submitted=18;clock.value=submitted;view.update(entity,submitted);await turn();requests[1].reject(Error('intentional final refusal'));await turn();for(const release of releases.splice(0))release();assert(owner.current());assert(wall.visible);assert.deepEqual(versions(wall),v);assert.equal(owner.repairLayer.sample(submitted),1);assert.equal(errors.length,1);}finally{view.dispose();for(const release of releases.splice(0))release();for(const p of Object.values(proto)){p.geometry.dispose();p.material.dispose();}}
});
