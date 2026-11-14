import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Matrix4,Raycaster,Vector3,DoubleSide} from 'three';
import {MeshStandardNodeMaterial} from 'three/webgpu';
import {uniform} from 'three/tsl';
import {nativeGateCrossingFixture} from './helpers/native-gate-crossings.js';
import {gateMeshPrototype} from './helpers/gate-mesh-source.js';
import {NativeWall} from '../src/rendering/walls.js';
import {createNativeGateGpuBinding} from '../src/rendering/native-gate-gpu-binding.js';
import {copyNativeRoutePresentation} from '../src/world/native-route-presentation.js';

function fixture({material='zarzas',reversing=false,yaw=0}={}){
 const f=nativeGateCrossingFixture({materials:[material],opening:reversing?1:0,yaw});
 let old;if(reversing){assert.equal(f.service.prepareMotion().status,'prepared');old=f.service.read(f.gates[0].id);}
 const turn=(x,z)=>[x*Math.cos(yaw)+z*Math.sin(yaw),-x*Math.sin(yaw)+z*Math.cos(yaw)],request=f.route({origin:turn(.05,reversing?-old.triggerRadius-.1:-6),points:[turn(.05,6)]}),admitted=f.admit(request);assert.equal(admitted.status,'admitted');
 const packet=f.bridge.captureNativeRoutePresentation(admitted.routeHandle),gate=packet.gates[0],entity={...f.gates[0],hp:1,maxHp:1},prototype=gateMeshPrototype(material);prototype.material.dispose();prototype.material=new MeshStandardNodeMaterial({side:DoubleSide});
 const wall=new NativeWall({[material+'_puerta']:prototype},entity,10),parent=new Group();new Matrix4().fromArray(gate.rootMatrix).decompose(parent.position,parent.quaternion,parent.scale);parent.scale.divide(wall.scale);parent.add(wall);
 let at=packet.startTime;
 const motion={timeNode:uniform(0),status:()=>({installed:{nativeRoute:packet.nativeRoute,start:{at:packet.startTime},end:{at:packet.endTime}}})},binding=createNativeGateGpuBinding({wall,presentation:gate,motion,getPickTime:()=>at});
 return {...f,packet,gate,entity,wall,parent,binding,motion,set pickTime(value){at=value;},close(){binding.dispose();wall.dispose();prototype.material.dispose();f.session.dispose();}};
}
const near=(a,b,tolerance=3e-6)=>assert(Math.abs(a-b)<=tolerance,`${a} != ${b}`);

test('native route capture includes each reserved gate and preserves the native motor and authority',()=>{
 const f=nativeGateCrossingFixture({materials:['zarzas','empalizada'],positions:[-3,3]});try{
  const admitted=f.admit(f.route({origin:[.05,-9],points:[[.05,9]]}));assert.equal(admitted.status,'admitted');
  const sequence=f.w.nav_intent_transition_sequence(),time=f.w.nav_intent_effective_time(),clocks=f.gates.map(gate=>f.service.read(gate.id));
  const packet=f.bridge.captureNativeRoutePresentation(admitted.routeHandle),copied=copyNativeRoutePresentation(packet);
  assert.equal(packet.gates.length,2);assert.deepEqual(packet.gates.map(g=>g.entityId),f.gates.map(g=>g.id));
  assert.equal(f.w.nav_intent_transition_sequence(),sequence);assert.equal(f.w.nav_intent_effective_time(),time);assert.deepEqual(f.gates.map(gate=>f.service.read(gate.id)),clocks);
  for(const gate of packet.gates){assert.equal(gate.rows[0],packet.startTime);assert.equal(gate.rows.at(-2),packet.endTime);assert.equal(gate.rows[1],0);assert.equal(gate.rows.at(-1),1);assert.notEqual(gate.positions,copied.gates.find(g=>g.gateId===gate.gateId).positions);}
  const wrong={...packet,gates:[{...packet.gates[0],nativeRoute:{...packet.nativeRoute,assignmentSequence:999}}]};assert.throws(()=>copyNativeRoutePresentation(wrong),/gate presentation/);
  assert.throws(()=>copyNativeRoutePresentation({...packet,gates:[packet.gates[0],packet.gates[0]]}),/Duplicate/);
 }finally{f.session.dispose();}
});

test('gate material preparation is hidden, retains the original mesh and stops CPU vertex updates only on activation',()=>{
 const f=fixture();try{
  const mesh=f.wall.parts[0].mesh,geometry=mesh.geometry,source=mesh.material,position=geometry.attributes.position,normal=geometry.attributes.normal,raycast=mesh.raycast,bytes=position.array.slice();
  assert.equal(mesh.material,source);assert.equal(f.wall.nativeGpuGate,undefined);assert.equal(mesh.raycast,raycast);
  f.binding.activate();assert.equal(f.wall.nativeGpuGate,f.binding);assert.equal(mesh.geometry,geometry);assert.equal(geometry.attributes.position,position);assert.equal(mesh.material,f.binding.material);
  const versions=[position.version,normal.version];f.wall.update({...f.entity,gateOpen:.8},undefined,10.5);assert.deepEqual([position.version,normal.version],versions);assert.deepEqual(position.array,bytes);
  assert.throws(()=>f.wall.bindNativeGateMechanism(f.bridge.nativeGateMechanism(f.gate.entityId)),/Invalid native gate mechanism binding/);assert.equal(mesh.material,f.binding.material);
  assert.throws(()=>f.wall.update({...f.entity,hp:.5},undefined,10.5),/prepared geometry/);
  f.binding.rollback();assert.equal(mesh.material,source);assert.equal(mesh.raycast,raycast);assert.equal(f.wall.nativeGpuGate,null);
  f.binding.activate();f.binding.commit();assert.throws(()=>f.binding.rollback(),/ownership changed/);assert.equal(mesh.material,f.binding.material);
 }finally{f.close();}
});

for(const material of ['zarzas','empalizada','reforzado'])test(`${material}: the captured gate curve and input surface match C++ through a closing prefix and reopening`,()=>{
 const f=fixture({material,reversing:true,yaw:.37});try{
  f.binding.activate();assert.equal(f.bridge.beginNativeRouteExecution().status,'started');
  const times=[10,10.05,...Array.from(f.gate.rows).filter((_,i)=>i%2===0)].sort((a,b)=>a-b),unique=[...new Set(times)],position=f.wall.parts[0].mesh.geometry.attributes.position,bytes=position.array.slice(),version=position.version;
  for(const at of unique){
   assert.equal(f.advance(at).status,'advanced');f.pickTime=at;const pose=f.bridge.nativeGateMechanismPose(f.gate.entityId);near(f.binding.sampleOpening(at),pose.opening);
   const vertices=f.bridge.nativeGateMechanismWorldVertices(f.gate.entityId);
   for(let i=0;i<f.gate.leafFlags.length;i+=3){
    if(!f.gate.leafFlags[i])continue;
    const a=new Vector3().fromArray(vertices,i*3),b=new Vector3().fromArray(vertices,(i+1)*3),c=new Vector3().fromArray(vertices,(i+2)*3),normal=b.clone().sub(a).cross(c.clone().sub(a));if(normal.lengthSq()<1e-8)continue;
    normal.normalize();const center=a.clone().add(b).add(c).multiplyScalar(1/3),hits=[],ray=new Raycaster(center.clone().addScaledVector(normal,.1),normal.clone().negate());
    f.binding.raycast(ray,hits);assert(hits.some(hit=>hit.object===f.binding.mesh&&hit.point.distanceTo(center)<2e-5),`${material} missing native leaf hit at ${at}`);break;
   }
  }
  assert.deepEqual(position.array,bytes);assert.equal(position.version,version);
 }finally{f.close();}
});

test('gate placement and immutable geometry mismatch reject before publishing a material',()=>{
 const f=fixture();try{
  const mesh=f.wall.parts[0].mesh,source=mesh.material;f.parent.position.x+=1;
  assert.equal(f.binding.canActivate(),false);assert.throws(()=>f.binding.activate(),/changed/);assert.equal(mesh.material,source);
  f.parent.position.x-=1;const gate={...f.gate,positions:f.gate.positions.slice()};gate.positions[0]+=.1;
  assert.throws(()=>createNativeGateGpuBinding({wall:f.wall,presentation:gate,motion:f.motion,getPickTime:()=>10}),/geometry mismatch/);assert.equal(mesh.material,source);
 }finally{f.close();}
});
