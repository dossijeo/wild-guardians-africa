import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {obstructionGeometry,updateObstructions} from '../src/rendering/obstruction.js';
import {obstructionFrame,obstructionVisibility} from '../src/rendering/obstruction-source.js';

const prototype={min:[-2,0,-2],max:[2,10,2]};
function fixture(count=32){
 const source=new THREE.BoxGeometry(4,10,4),instances=Array.from({length:count},(_,i)=>({id:`prop-${i}`,x:(i%8)*3-10,y:0,z:Math.floor(i/8)*5-10,sx:1,sy:1,sz:1,yaw:i*.21}));
 const geometry=obstructionGeometry(source,instances,prototype,0),group=new THREE.Group();group.add(new THREE.InstancedMesh(geometry,new THREE.MeshStandardMaterial(),count));
 return {chunks:new Map([['0,0',group]]),group,fade:geometry.userData.obstruction,dispose(){geometry.dispose();source.dispose();group.children[0].material.dispose();}};
}
// Previous uncached loop, kept as a behavioral oracle rather than cache internals.
function uncached(fade,camera,target,dt,{enabled=true,distance=7,snap=false}={}){
 const frame=obstructionFrame(camera.position.toArray(),target.toArray(),THREE.MathUtils.degToRad(camera.fov),camera.aspect,distance),stats={hidden:0,fading:0,affected:0};dt=Math.max(0,Math.min(.12,dt));
 for(let i=0;i<fade.records.length;i++){
  const desired=enabled?obstructionVisibility(fade.records[i],frame):1,old=fade.array[i],rate=desired<old?16:7;
  let value=snap||fade.fresh?desired:old+(desired-old)*(1-Math.exp(-dt*rate));
  if(Math.abs(value-desired)<.008)value=desired;if(value<.002)value=0;if(value>.998)value=1;
  if(Math.abs(value-old)>.0001)fade.array[i]=value;
  if(value<.999){stats.affected++;if(value<.002)stats.hidden++;else stats.fading++;}
 }
 fade.fresh=false;return stats;
}

test('cached coverage matches every previous frame through fades, tiny camera moves, lens, target, toggle, distance and snap',()=>{
 const f=fixture(128),camera=new THREE.PerspectiveCamera(60,1.5),target=new THREE.Vector3(0,5,-10),oracle={records:f.fade.records,array:new Float32Array(128).fill(1),fresh:true};
 const poses=[{eye:[0,8,30]},{eye:[0,8,4]},{eye:[0,8,4.00000001]},{eye:[1,8,4],fov:45},{eye:[1,8,4],aspect:.5},{eye:[1,8,4],target:[10,5,-10]},{eye:[1,8,4],distance:12},{eye:[1,8,4],enabled:false},{eye:[1,8,4],snap:true},{eye:[0,8,0],enabled:true},{eye:[0,8,30]}];
 for(const pose of poses){
  camera.position.fromArray(pose.eye);camera.fov=pose.fov??60;camera.aspect=pose.aspect??1.5;target.fromArray(pose.target??[0,5,-10]);
  for(let i=0;i<150;i++){
   const dt=[0,.016,.05,.12,10][i%5],options={enabled:pose.enabled??true,distance:pose.distance??7,snap:!!pose.snap&&i===0};
   assert.deepEqual(updateObstructions(f.chunks,camera,target,dt,options),uncached(oracle,camera,target,dt,options));
   assert.deepEqual(f.fade.attribute.array,oracle.array);
  }
 }
 f.dispose();
});

test('settled population performs no further prop queries or coverage packing until camera or population changes',()=>{
 const f=fixture(2048),camera=new THREE.PerspectiveCamera(60,1.5),target=new THREE.Vector3(0,5,-10);camera.position.set(0,8,4);
 let reads=0,packs=0;
 for(const record of f.fade.records){const x=record.x;Object.defineProperty(record,'x',{get(){reads++;return x;}});}
 f.group.userData.lodBatches=[{fade:f.fade,packCoverage(){packs++;}}];f.group.children[0].userData.nativeLodBatch={};
 const first=updateObstructions(f.chunks,camera,target,.016),initialReads=reads,version=f.fade.attribute.version,initialPacks=packs;
 assert.ok(initialReads>=2048);assert.ok(initialPacks>0);
 for(let i=0;i<210;i++)assert.deepEqual(updateObstructions(f.chunks,camera,target,.016),first);
 assert.equal(reads,initialReads);assert.equal(packs,initialPacks);assert.equal(f.fade.attribute.version,version);
 camera.position.x+=1e-8;updateObstructions(f.chunks,camera,target,.016);assert.ok(reads>initialReads);
 const retained=f.fade.attribute.array.slice();f.chunks.delete('0,0');assert.deepEqual(updateObstructions(f.chunks,camera,target,.016),{hidden:0,fading:0,affected:0});assert.deepEqual(f.fade.attribute.array,retained);
 const replacement=fixture(1);replacement.chunks=new Map([['0,0',replacement.group]]);assert.deepEqual(updateObstructions(replacement.chunks,camera,target,.016),uncached({records:replacement.fade.records,array:new Float32Array(1).fill(1),fresh:true},camera,target,.016));
 replacement.dispose();f.dispose();
});

test('explicit fresh population, replaced records and external coverage upload invalidate settled coverage',()=>{
 const f=fixture(1),camera=new THREE.PerspectiveCamera(60,1.5),target=new THREE.Vector3(0,5,-10);camera.position.set(0,8,4);
 updateObstructions(f.chunks,camera,target,.016);
 f.fade.records=f.fade.records.map(record=>({...record,x:100}));f.fade.fresh=true;updateObstructions(f.chunks,camera,target,.016);assert.equal(f.fade.attribute.array[0],1);
 f.fade.attribute.array[0]=0;f.fade.attribute.needsUpdate=true;
 updateObstructions(f.chunks,camera,target,.05);assert.ok(Math.abs(f.fade.attribute.array[0]-(1-Math.exp(-.05*7)))<1e-7);
 f.fade.fresh=true;updateObstructions(f.chunks,camera,target,0);assert.equal(f.fade.attribute.array[0],1);
 f.dispose();
});
