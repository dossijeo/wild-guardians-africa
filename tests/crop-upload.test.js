import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCropBatch} from '../src/rendering/crop-batch.js';
import {cropSpec} from '../src/simulation/rules.js';

function fixture(){
  const scene=new THREE.Scene(),source=new THREE.Group(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),models=[],pairs=[];
  for(let crop=0;crop<8;crop++)for(let stage=1;stage<=5;stage++){
    const mesh=new THREE.Mesh(geometry,material);mesh.userData={cropIndex:crop,stage,crop:'fixture',height:stage,foliageRadius:.5};source.add(mesh);
    models.push({vertices:geometry.attributes.position.count,faces:geometry.index.count/3,faceLabels:Array(geometry.index.count/3).fill(0),regions:[{root:[0,0,0],direction:[0,1,0]}]});
    if(stage<5)pairs.push({a:crop*5+stage-1,b:crop*5+stage,a2b:[0],b2a:[0]});
  }
  const batch=createCropBatch(scene,{capabilities:{getMaxAnisotropy:()=>1}},{scene:source},{models,pairs},8);
  const plant=(id,ratio=1)=>({id:'p'+id,species:'maiz',x:id+.123456789,z:id+.987654321,rotation:.234567891,growth:ratio*cropSpec('maiz').growth_seconds});
  return {scene,batch,plant,active:()=>scene.children.filter(m=>m.count),close(){batch.dispose();geometry.dispose();material.dispose();}};
}
const attribute=m=>m.geometry.attributes.iGrowth??m.geometry.attributes.iBridge;
const ranges=m=>{m.instanceMatrix.clearUpdateRanges();attribute(m).clearUpdateRanges();};

test('retiring a crop batch releases InstancedMesh buffers for every stage and bridge',()=>{
  const f=fixture(),meshes=[...f.scene.children],retired=[];
  assert.equal(meshes.length,72); // Forty original stages and thirty-two bridges.
  for(const mesh of meshes)mesh.addEventListener('dispose',()=>retired.push(mesh));
  f.close();
  assert.equal(f.scene.children.length,0);
  assert.equal(new Set(retired).size,72);
  assert.ok(meshes.every(mesh=>retired.includes(mesh)));
});

test('mature plants and paused morphs keep both buffer versions stable; wind changes through the shared uniform alone',()=>{
  const f=fixture(),plants=[f.plant(1),f.plant(2,.065+(.27-.065)*.81)];f.batch.update(plants,1,()=>2);
  const before=f.active().map(m=>({m,matrix:m.instanceMatrix.version,growth:attribute(m).version}));before.forEach(({m})=>ranges(m));
  f.batch.update(plants,1,()=>2);f.batch.update(plants,9,()=>2);
  for(const {m,matrix,growth} of before){assert.equal(m.instanceMatrix.version,matrix);assert.equal(attribute(m).version,growth);assert.deepEqual(m.instanceMatrix.updateRanges,[]);assert.deepEqual(attribute(m).updateRanges,[]);const shader={uniforms:{},vertexShader:THREE.ShaderLib.depth.vertexShader};m.customDepthMaterial.onBeforeCompile(shader);assert.equal(shader.uniforms.uClock.value,9);}
  f.close();
});

test('growth within a stage uploads only growth components while the position and rotation remain untouched',()=>{
  const f=fixture(),plants=[f.plant(1,.01),f.plant(2,.01)];f.batch.update(plants,0,()=>2);const [m]=f.active(),matrix=m.instanceMatrix.version,attr=attribute(m),version=attr.version;ranges(m);
  plants[1].growth*=1.2;f.batch.update(plants,0,()=>2);
  assert.equal(m.instanceMatrix.version,matrix);assert.equal(attr.version,version+1);assert.equal(attr.updateRanges.length,1);assert.ok(attr.updateRanges[0].start>=4);assert.ok(attr.updateRanges[0].start+attr.updateRanges[0].count<=8);assert.ok(attr.updateRanges[0].count<attr.array.length);
  f.close();
});

test('slot changes, height and recentering update matrices, retain unchanged growth, and clamp visible count to capacity',()=>{
  const f=fixture(),plants=[f.plant(1),f.plant(2)];f.batch.update(plants,0,()=>2);const [m]=f.active(),attr=attribute(m),version=attr.version,matrix=new THREE.Matrix4();ranges(m);
  f.batch.update([...plants].reverse(),0,()=>3,{x:48,z:-48});m.getMatrixAt(0,matrix);assert.equal(matrix.elements[12],Math.fround(plants[1].x-48));assert.equal(matrix.elements[13],3);assert.equal(matrix.elements[14],Math.fround(plants[1].z+48));
  assert.equal(attr.version,version+1); // seeds follow the reordered logical plants
  ranges(m);const stable=attr.version;f.batch.update([...plants].reverse(),0,()=>3,{x:96,z:-48});assert.equal(attr.version,stable);assert.ok(m.instanceMatrix.updateRanges.every(r=>r.start+r.count<=32));
  f.batch.update([],0,()=>3);assert.equal(m.count,0);assert.equal(m.visible,false);
  f.batch.update(Array.from({length:10},(_,i)=>f.plant(i)),0,()=>3);assert.equal(m.count,8);f.close();
});

test('multiple updates before a GPU draw retain earlier dirty ranges and never upload the unused capacity',()=>{
  const f=fixture(),plants=[f.plant(1,.01),f.plant(2,.01)];f.batch.update(plants,0,()=>0);const [m]=f.active(),attr=attribute(m);ranges(m);
  plants[0].growth*=1.1;f.batch.update(plants,0,()=>0);const first={...attr.updateRanges[0]};plants[1].growth*=1.2;f.batch.update(plants,0,()=>0);
  assert.deepEqual(attr.updateRanges[0],first);assert.equal(attr.updateRanges.length,2);assert.ok(attr.updateRanges.every(r=>r.start+r.count<=8));f.close();
});


test('immutable terrain heights survive growth, slot reorder, wind and origin changes without resampling',()=>{
  const f=fixture(),plants=[f.plant(1),f.plant(2,.065+(.27-.065)*.81)],before=structuredClone(plants),field={};let calls=0;
  const ground=(x,z)=>{calls++;return x*.2+z*.3;};
  f.batch.update(plants,0,ground,undefined,field);assert.equal(calls,2);
  for(let frame=0;frame<60;frame++)f.batch.update([...plants].reverse(),frame/60,ground,{x:48,z:-48},field);
  assert.equal(calls,2);assert.deepEqual(plants,before);
  plants[0].growth*=.8;f.batch.update(plants,2,ground,undefined,field);assert.equal(calls,2);
  plants[0].x+=3;f.batch.update(plants,3,ground,undefined,field);assert.equal(calls,3);
  f.batch.update(plants,4,ground,undefined,{});assert.equal(calls,5);
  f.batch.update(structuredClone(plants),5,ground,undefined,field);assert.equal(calls,7);
  f.close();
});

test('unkeyed ground remains dynamic, including after leaving keyed terrain',()=>{
  const f=fixture(),plants=[f.plant(1)],field={},matrix=new THREE.Matrix4();let height=2,calls=0;
  const ground=()=>{calls++;return height;};
  f.batch.update(plants,0,ground,undefined,field);height=3;
  f.batch.update(plants,1,ground);f.active()[0].getMatrixAt(0,matrix);assert.equal(matrix.elements[13],3);
  height=4;f.batch.update(plants,2,ground);f.active()[0].getMatrixAt(0,matrix);assert.equal(matrix.elements[13],4);assert.equal(calls,3);
  f.close();
});

test('cached terrain and metadata preserve every Float32 buffer through changing native presentation inputs',()=>{
  const a=fixture(),b=fixture(),plants=[a.plant(1),a.plant(2,.22),a.plant(3,.01)],field={};
  const ground=(x,z)=>Math.sin(x)*.1+Math.cos(z)*.3;
  for(let frame=0;frame<20;frame++){
    if(frame===3){plants[0].species='mijo';plants[0].id='p99';}
    if(frame===7)plants[1].z+=2;
    if(frame===10)plants.reverse();
    plants[2].growth+=.1;
    const origin={x:frame>12?96:0,z:-48};
    a.batch.update(plants,frame,ground,origin,field);b.batch.update(plants,frame,ground,origin);
    for(let i=0;i<a.scene.children.length;i++){
      const x=a.scene.children[i],y=b.scene.children[i];assert.equal(x.count,y.count);assert.equal(x.visible,y.visible);
      assert.deepEqual(x.instanceMatrix.array,y.instanceMatrix.array);assert.deepEqual(attribute(x).array,attribute(y).array);
    }
  }
  a.close();b.close();
});
