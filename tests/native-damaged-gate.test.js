import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {BufferGeometry,DoubleSide,Matrix4,Mesh,Raycaster,Vector3} from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {morphedWallPositions} from '../src/rendering/walls-native.js';
import {createNativeGateGpuClock} from '../src/rendering/native-gate-gpu-clock.js';
import {createWebGpuAdmittedWall} from '../src/rendering/webgpu-wall-admission.js';
import {nativeGateCrossingFixture} from './helpers/native-gate-crossings.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
const pack=JSON.parse(readFileSync(new URL('../public/content/walls.json',import.meta.url)));

function prototypes(material){
 const array=(descriptor,Type)=>{
  const bytes=readFileSync(new URL('../public'+descriptor.url,import.meta.url));
  return new Type(bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength));
 };
 return Object.fromEntries(['puerta','destruido'].map(suffix=>{
  const key=material+'_'+suffix,piece=pack.pieces[key];
  const morph=Object.fromEntries(Object.entries(piece.morph).map(([target,bridge])=>[
   target,{peers:bridge.peers,p:array(bridge.p,Float32Array),n:array(bridge.n,Float32Array)}
  ]));
  const mesh=new Mesh(new BufferGeometry(),new MeshStandardNodeMaterial({side:DoubleSide}));
  mesh.userData.nativePiece={p:array(piece.p,Float32Array),n:array(piece.n,Float32Array),uv:array(piece.uv,Float32Array),
   i:array(piece.i,Uint16Array),faceRegions:array(piece.faceRegions,Uint16Array),regions:piece.regions,morph};
  return [key,mesh];
 }));
}

async function fixture(material='zarzas'){
 const yaw=.37,c=Math.cos(yaw),s=Math.sin(yaw),point=(x,z)=>[x*c+z*s,-x*s+z*c];
 const native=nativeGateCrossingFixture({materials:[material],yaw});
 const admitted=native.admit(native.route({origin:point(.05,-6),points:[point(.05,6)]}));
 assert.equal(admitted.status,'admitted');
 const captured=native.bridge.captureNativeRoutePresentation(admitted.routeHandle).gates[0];
 const gate={...captured,nativeRoute:undefined,worldBoundary:{version:1,authorityEpoch:'damage-test',nativeSession:1,ticket:3,effectiveTime:captured.startTime}};
 const motion=createNativeGateGpuClock(gate),entity={...native.gates[0],hp:30,maxHp:60};
 const assets=prototypes(material),requests=[],releases=[],errors=[];
 const pipelineAdmission={prepare(object){return new Promise((resolve,reject)=>requests.push({object,resolve,reject}));},
  deferRelease(object,done){releases.push({object,done});}};
 const view=createWebGpuAdmittedWall({prototypes:assets,entity,elapsed:10,pipelineAdmission,onError:e=>errors.push(e)});
 await turn();requests[0].resolve();await turn();
 const wall=view.group.children.find(value=>value.visible);
 assert(wall);
 new Matrix4().fromArray(gate.rootMatrix).decompose(view.group.position,view.group.quaternion,view.group.scale);
 view.group.scale.divide(wall.scale);
 let at=gate.startTime;
 return {view,wall,gate,motion,entity,requests,releases,errors,set time(value){at=value;},
  bind(){const part=view.prepareNativeGate({presentation:gate,motion,getPickTime:()=>at});part.activate();part.finalize();return wall.nativeGpuGate;},
  close(){view.dispose();for(const release of releases.splice(0))release.done();
   for(const asset of Object.values(assets)){asset.geometry.dispose();asset.material.dispose();}native.session.dispose();}};
}

for(const material of ['zarzas','empalizada','reforzado'])test(`${material}: the motor rotates damaged geometry and preserves debris`,async()=>{
 const f=await fixture(material);
 try{
  const [leaf,debris]=f.wall.parts,rest=morphedWallPositions(leaf.bridge,.5).slice();
  const position=leaf.mesh.geometry.attributes.wgGatePosition,version=position.version;
  f.wall.update({...f.entity,gateOpen:.25},undefined,10);
  assert.equal(position.version,version);
  const geometry=debris.mesh.geometry,debrisMaterial=debris.mesh.material,bytes=geometry.attributes.position.array.slice();
  const binding=f.bind();
  assert.deepEqual(position.array,rest);
  assert(rest.some((value,i)=>value!==f.gate.positions[i]));
  assert.equal(debris.mesh.geometry,geometry);
  assert.equal(debris.mesh.material,debrisMaterial);
  assert.deepEqual(geometry.attributes.position.array,bytes);
  assert.throws(()=>f.wall.update({...f.entity,hp:10},undefined,10),/prepared geometry/);
  assert.throws(()=>f.wall.update({...f.entity,hp:0,status:'ruined'},undefined,10),/prepared geometry/);

  const pivot=new Vector3().fromArray(f.gate.hinge),root=new Matrix4().fromArray(f.gate.rootMatrix);
  for(const at of [f.gate.startTime,f.gate.endTime]){
   f.time=at;
   const rotation=new Matrix4().makeRotationY(-binding.sampleOpening(at)*Math.PI/2);
   let checked=false;
   for(let i=0;i<f.gate.leafFlags.length;i+=3){
    if(!f.gate.leafFlags[i])continue;
    const [a,b,c]=[0,1,2].map(j=>new Vector3().fromArray(rest,(i+j)*3).sub(pivot).applyMatrix4(rotation).add(pivot).applyMatrix4(root));
    const normal=b.clone().sub(a).cross(c.clone().sub(a));
    if(normal.lengthSq()<1e-8)continue;
    normal.normalize();
    const center=a.clone().add(b).add(c).multiplyScalar(1/3),hits=[];
    binding.raycast(new Raycaster(center.clone().addScaledVector(normal,.01),normal.clone().negate()),hits);
    assert(hits.some(hit=>hit.point.distanceTo(center)<2e-5));
    checked=true;
    break;
   }
   assert(checked);
  }
 }finally{f.close();}
});

for(const failed of [false,true])test(`Repair ${failed?'failure preserves damage':'admits the intact mesh using the retained motor'}`,async()=>{
 const f=await fixture();
 try{
  const old=f.wall,binding=f.bind(),clock=f.motion.clockNode;
  let disposed=0;
  for(const part of old.parts)part.mesh.geometry.addEventListener('dispose',()=>disposed++);
  f.view.update({...f.entity,hp:60},10);
  await turn();
  const next=f.requests[1].object;
  assert.equal(old.visible,true);
  assert.equal(next.visible,false);
  assert.equal(next.parts.length,1);
  assert(binding.current());
  assert(next.nativeGpuGate.current());
  assert.deepEqual(next.nativeGpuGate.nativeGate,binding.nativeGate);
  assert.equal(f.motion.clockNode,clock);
  if(failed)f.requests[1].reject(Error('admission failure'));
  else f.requests[1].resolve();
  await turn();
  assert.equal(f.errors.length,Number(failed));
  const retained=failed?old:next,retired=failed?next:old;
  assert.equal(retained.visible,true);
  assert.equal(retired.parent,null);
  assert.equal(disposed,0);
  for(const release of f.releases.splice(0))release.done();
  assert.equal(disposed,failed?0:2);
  assert(retained.nativeGpuGate.current());
 }finally{f.close();}
});
