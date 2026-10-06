import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createCropBatch} from './browser/crop-batch-sample-cache-candidate.js';
import {createCropBatch as beforeCache} from '../src/rendering/crop-batch.js';
import {cropSpec} from '../src/simulation/rules.js';
export const cropIds=['maiz','algodon','girasol','platano','sorgo','mijo','yuca','batata'];
export function sampleCacheFixture(factory=createCropBatch,capacity=64){
 const scene=new THREE.Scene(),source=new THREE.Group(),geometry=new THREE.BoxGeometry(),material=new THREE.MeshStandardMaterial(),models=[],pairs=[];
 for(let crop=0;crop<8;crop++)for(let stage=1;stage<=5;stage++){
  const mesh=new THREE.Mesh(geometry,material);mesh.userData={cropIndex:crop,stage,crop:'fixture',height:stage,foliageRadius:.5};source.add(mesh);
  models.push({vertices:geometry.attributes.position.count,faces:geometry.index.count/3,faceLabels:Array(geometry.index.count/3).fill(0),regions:[{root:[0,0,0],direction:[0,1,0]}]});
  if(stage<5)pairs.push({a:crop*5+stage-1,b:crop*5+stage,a2b:[0],b2a:[0]});
 }
 const batch=factory(scene,{capabilities:{getMaxAnisotropy:()=>1}},{scene:source},{models,pairs},capacity);
 return {scene,batch,dispose(){batch.dispose();geometry.dispose();material.dispose();}};
}
test('cached per-entity growth recipes retain all Float32 buffers through paused cohorts and live changes',()=>{
 const a=sampleCacheFixture(),b=sampleCacheFixture(beforeCache),field={},plants=Array.from({length:96},(_,i)=>({id:'p'+i,species:cropIds[i%8],x:i,z:i%11,rotation:i*.1,growth:cropSpec(cropIds[i%8]).growth_seconds*((i%12+.5)/12)}));
 const ground=(x,z)=>Math.sin(x)*.1+z*.02;
 try{for(let frame=0;frame<40;frame++){
  if(frame===4)plants.reverse();if(frame===8)plants.splice(3,7);if(frame===12)plants[0].growth=0;if(frame===16)plants[1].growth=cropSpec(plants[1].species).growth_seconds;if(frame===20){plants[2].species='batata';plants[2].id='p999';}if(frame===24)plants[3].x+=2;if(frame===28)plants.push({...plants[0],id:'p1000',x:200});
  if(frame>30)for(const p of plants)p.growth+=.05;
  const origin={x:frame>18?48:0,z:frame>34?-48:0},key=frame<22?field:null;
  const before=structuredClone(plants);a.batch.update(plants,frame,ground,origin,key);b.batch.update(plants,frame,ground,origin,key);assert.deepEqual(plants,before);
  for(let i=0;i<a.scene.children.length;i++){
   const x=a.scene.children[i],y=b.scene.children[i];assert.equal(x.count,y.count);assert.equal(x.visible,y.visible);assert.deepEqual(x.instanceMatrix.array,y.instanceMatrix.array);
   assert.deepEqual((x.geometry.attributes.iGrowth??x.geometry.attributes.iBridge).array,(y.geometry.attributes.iGrowth??y.geometry.attributes.iBridge).array);
  }
 }}finally{a.dispose();b.dispose();}
});
