import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {createNativeRouteExecutionFixture as fixture} from './helpers/native-route-execution.js';
import {gateMeshPrototype} from './helpers/gate-mesh-source.js';
import {createSpatialGateIntents} from '../src/world/wild-engine/spatial-gate-intents.js';
import {NativeWall} from '../src/rendering/walls.js';
import {articulateGate} from '../src/rendering/gate-articulation.js';
import {gateFrameFootprints} from '../src/world/gate-passages.js';

function setup({material='zarzas',yaw=0,baseScaleX=1,opening=0,flat=true,install=true}={}){
 const f=fixture(),p=f.point(0,0);if(flat)f.session.core.setSettlement(p.x,p.z,10,10);
 const entity={id:'structure-990001',kind:'wall',gate:true,status:'intact',material,...p,yaw,baseScaleX,gateOpen:opening,hp:60,maxHp:60},
  service=createSpatialGateIntents(f.session,f.state);assert(service.register(entity));
 const result=install?service.installMechanism(entity.id,material):null;
 if(install)assert.equal(result.status,'installed',JSON.stringify({material,yaw,baseScaleX,result}));
 return {...f,entity,service,result};
}
const world=(pose,x,z)=>new THREE.Vector3(x,0,z).applyMatrix4(new THREE.Matrix4().fromArray(pose.rootMatrix));
function body(f,id=1,kind=0,r=.28){const p=f.point(0,-3);assert.equal(f.w.spatial_body_upsert(id,p.x,p.z,r,kind,1),1);return p;}
function request(f){
 const a=body(f),b=f.point(0,6);f.session.actorSectorRevision({worker:true});const ptr=f.w.nav_intent_attack_route_input_ptr(1);
 new Float32Array(f.w.memory.buffer,ptr,2).set([b.x,b.z]);assert.equal(f.w.nav_intent_restore_home(900011,a.x,a.z,b.x,b.z,1),1);f.bridge.intentChanges();
 assert(f.service.bindWorker('worker-900011',1));assert.equal(f.service.prepareMotion().status,'prepared');
}
const tick=(f,t)=>{f.state.elapsed=t;assert.equal(f.w.nav_intent_set_time(t),1);};

test('compiled mechanism geometry is bound to the unchanged authored assets and calibration',()=>{
 const manifest=JSON.parse(readFileSync(new URL('../content/manifests/gate-mechanisms-native.json',import.meta.url),'utf8')),
  hash=bytes=>createHash('sha256').update(bytes).digest('hex');
 assert.equal(hash(readFileSync(new URL('../src/world/wild-engine/spatial-gate-mechanisms-native.h',import.meta.url))),manifest.headerSha256);
 for(const [path,expected] of Object.entries(manifest.sources)){
  const raw=readFileSync(new URL('../'+path,import.meta.url)),bytes=path.endsWith('.json')?Buffer.from(raw.toString('utf8').replaceAll('\r\n','\n')):raw;
  assert.equal(hash(bytes),expected,path);
 }
});

test('all three native mechanisms share canonical geometry, authoritative matrices and real actor collision with drawing',()=>{
 for(const material of ['zarzas','empalizada','reforzado'])for(const yaw of [0,.73])for(const baseScaleX of [1,1.3]){
  const f=setup({material,yaw,baseScaleX}),prototype=gateMeshPrototype(material),wall=new NativeWall({[material+'_puerta']:prototype},f.entity);
  try{
   const mechanism=f.bridge.nativeGateMechanism(f.entity.id);assert.equal(mechanism.collisionModel,'kinematic-union');
   assert.equal(mechanism.baseY,f.w.spatial_surface_anywhere(f.entity.x,f.entity.z)+.025);
   assert(mechanism.supportMax-mechanism.supportMin<=1e-6);wall.bindNativeGateMechanism(mechanism);request(f);
   const closed=f.bridge.nativeGateMechanismPose(f.entity.id),a=world(closed,.05,-2),b=world(closed,.05,2);
   assert.equal(f.bridge.nativeGateMechanismSegment(f.entity.id,1,a,b).status,'blocked');
   const frame=[];for(let i=0;i<mechanism.leafFlags.length;i++)if(!mechanism.leafFlags[i])frame.push(i);
   for(const fraction of [0,.2,.5,.8,1]){
    tick(f,10+.6*fraction);const pose=f.bridge.nativeGateMechanismPose(f.entity.id);assert(Math.abs(pose.opening-fraction)<1e-12);
    wall.update({...f.entity,gateOpen:1-fraction,nativeGatePose:pose});wall.updateMatrixWorld(true);
    const actual=wall.parts[0].mesh.geometry.attributes.position.array,legacy=articulateGate(wall.parts[0].bridge,fraction,mechanism.positions,wall.parts[0].bridge.normal.slice());
    for(let i=0;i<actual.length;i++)assert(Math.abs(actual[i]-legacy[i])<1e-6,`${material} articulated vertex ${i}`);
    for(const i of frame)for(let k=0;k<3;k++)assert.equal(actual[i*3+k],mechanism.positions[i*3+k]);
    assert.deepEqual(wall.matrix.elements,pose.rootMatrix);
   }
   const open=f.bridge.nativeGateMechanismPose(f.entity.id);assert.equal(f.bridge.nativeGateMechanismSegment(f.entity.id,1,world(open,.05,-2),world(open,.05,2)).status,'clear');
   assert(f.service.staticObjectsCertified(f.entity.id));assert.equal(mechanism.authorizedPassage,false);
  }finally{wall.dispose();prototype.geometry.dispose();prototype.material.dispose();f.session.dispose();}
 }
});

test('occupied frame/leaf overlap remains occupied rather than being removed as an internal contact exception',()=>{
 const f=setup();try{
  body(f,77,0,.02);const pose=f.bridge.nativeGateMechanismPose(f.entity.id);let found=null;
  for(let x=-.75;x<-.35&&!found;x+=.02)for(let z=-.2;z<.5&&!found;z+=.02){const p=world(pose,x,z),hit=f.bridge.nativeGateMechanismSegment(f.entity.id,77,p,p);
   if((hit.components&1)&&(hit.components&8))found={p,hit};}
  assert(found,'compound seam must remain in both component occupancies');assert.equal(found.hit.status,'blocked');
  assert.equal(f.w.spatial_body_upsert(77,found.p.x,found.p.z,.02,0,1),0);
 }finally{f.session.dispose();}
});

test('animal wall policy remains blocked at the opening while the real worker collider clears it',()=>{
 const f=setup({opening:1});try{
  body(f,1,0);body(f,10,1,1.1);const pose=f.bridge.nativeGateMechanismPose(f.entity.id),a=world(pose,.05,-2),b=world(pose,.05,2);
  assert.equal(f.bridge.nativeGateMechanismSegment(f.entity.id,1,a,b).status,'clear');
  const animal=f.bridge.nativeGateMechanismSegment(f.entity.id,10,a,b);assert.equal(animal.status,'blocked');assert(animal.components&16);
 }finally{f.session.dispose();}
});

test('native support rejects nonflat or unavailable ground without moving the root or installing partial physics',()=>{
 const f=setup({flat:false,install:false});try{
  const before=f.service.read(f.entity.id),snapshot=f.session.core.snapshot();
  assert.equal(f.service.installMechanism(f.entity.id,f.entity.material).status,'unsupported-support');
  assert.equal(f.bridge.nativeGateMechanismPose(f.entity.id),null);assert.deepEqual(f.service.read(f.entity.id),before);assert.deepEqual(f.session.core.snapshot(),snapshot);
 }finally{f.session.dispose();}
 const g=setup({install:false});try{
  assert.equal(g.session.core.removeChunk(0,0),1);
  assert.equal(g.service.installMechanism(g.entity.id,g.entity.material).status,'unknown');assert.equal(g.bridge.nativeGateMechanismPose(g.entity.id),null);
 }finally{g.session.dispose();}
});

test('installing around an existing body or foreign authored frame is rejected atomically, with no owner/ID bypass',()=>{
 for(const foreign of ['body','frame']){
  const f=setup({install:false});try{
   if(foreign==='body'){const p=f.point(-.9,0);assert.equal(f.w.spatial_body_upsert(77,p.x,p.z,.1,0,1),1);}
   else assert(f.session.core.addPolygon(gateFrameFootprints(f.entity,1)[0],0)>0);
   const before=f.session.core.snapshot();assert.equal(f.service.installMechanism(f.entity.id,f.entity.material).status,'blocked');
   assert.equal(f.bridge.nativeGateMechanismPose(f.entity.id),null);assert.deepEqual(f.session.core.snapshot(),before);
  }finally{f.session.dispose();}
 }
});

test('the fixed frame and native support remain protected even after a policy-only reconciliation',()=>{
 const f=setup({opening:1});try{
  assert.equal(f.service.reconcile({enabled:false}).status,'updated');assert(f.service.staticObjectsCertified(f.entity.id));
  const p=f.point(-.9,0),before=f.session.core.snapshot();assert.equal(f.session.core.addWall(p.x,p.z,.01,.01),0);
  assert.throws(()=>f.session.core.setSettlement(f.entity.x+3,f.entity.z,5,5),/Native terrain mutation rejected/);
  assert.deepEqual(f.session.core.snapshot(),before);assert(f.service.staticObjectsCertified(f.entity.id));
 }finally{f.session.dispose();}
});

test('render binding rejects epoch/session/reused identity mismatches and never falls back to an entity opening clock',()=>{
 const f=setup(),prototype=gateMeshPrototype('zarzas'),wall=new NativeWall({zarzas_puerta:prototype},f.entity);
 try{
  const mechanism=f.bridge.nativeGateMechanism(f.entity.id);wall.bindNativeGateMechanism(mechanism);
  assert.throws(()=>wall.update({...f.entity,gateOpen:1}),/pose is missing/);
  for(const change of [{authorityEpoch:'other'},{nativeSession:mechanism.nativeSession+1},{mechanism:mechanism.mechanism+1}])
   assert.throws(()=>wall.applyNativeGatePose({...mechanism,...change}),/obsolete/);
  assert.throws(()=>wall.update({...f.entity,hp:50,nativeGatePose:mechanism}),/lifecycle transition/);
  assert.throws(()=>wall.update({...f.entity,gate:false,nativeGatePose:mechanism}),/lifecycle transition/);
  assert(f.service.remove(f.entity.id));assert(f.service.register(f.entity));assert.equal(f.service.installMechanism(f.entity.id,'zarzas').status,'installed');
  assert.throws(()=>wall.applyNativeGatePose(f.bridge.nativeGateMechanismPose(f.entity.id)),/obsolete/);
 }finally{wall.dispose();prototype.geometry.dispose();prototype.material.dispose();f.session.dispose();}
});

test('native shape/model mismatches and changed render geometry cannot be bound as an authored mechanism',()=>{
 const f=setup({install:false});try{
  assert.equal(f.service.installMechanism(f.entity.id,'reforzado').status,'invalid');
  assert.equal(f.service.installMechanism(f.entity.id,'zarzas').status,'installed');const mechanism=f.bridge.nativeGateMechanism(f.entity.id),
   prototype=gateMeshPrototype('zarzas'),wall=new NativeWall({zarzas_puerta:prototype},f.entity);
  try{const changed=mechanism.positions.slice();changed[0]+=.1;assert.throws(()=>wall.bindNativeGateMechanism({...mechanism,positions:changed}),/geometry does not match/);}
  finally{wall.dispose();prototype.geometry.dispose();prototype.material.dispose();}
 }finally{f.session.dispose();}
});
