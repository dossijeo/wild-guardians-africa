import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuSettlements} from '../src/rendering/webgpu-settlements.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
async function until(predicate){for(let n=0;n<100;n++){if(predicate())return;await turn();}throw Error('Settlement fixture did not become ready');}
async function fixture(){
 const originalFetch=globalThis.fetch,originalBitmap=globalThis.createImageBitmap,buffer=new ArrayBuffer(108);
 new Float32Array(buffer,0,24).set([-.5,0,-.5,0,1,0,0,0,.5,0,-.5,0,1,0,1,0,0,1,.5,0,1,0,.5,1]);new Uint32Array(buffer,96,3).set([0,1,2]);
 const unit=key=>({key,offset:0,count:3,min:[-.5,0,-.5],max:[.5,1,.5]}),village={id:'qa',vertexBytes:96,indexCount:3,units:[unit('house'),unit('hut')],binary:{url:'/qa/village.bin'},textures:{color:'/qa/color.png'}};
 globalThis.fetch=async url=>({ok:true,json:async()=>String(url).endsWith('/villages.json')?[village]:[],arrayBuffer:async()=>buffer.slice(0),blob:async()=>new Blob()});
 globalThis.createImageBitmap=async()=>({width:1,height:1,close(){}});
 const scene=new THREE.Scene(),state={elapsed:10,villages:[{id:'village-1',culture:'qa',buildings:[{key:'house',x:1,z:2}]}],structures:[]},requests=[],errors=[],heights=new Map(),meshes=[],snapshots=[];
 const terrain=(y,key='0,0')=>{const mesh=new THREE.Mesh(new THREE.PlaneGeometry(48,48),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));mesh.rotation.x=-Math.PI/2;mesh.position.y=y;heights.set(key,mesh);meshes.push(mesh);return mesh;};terrain(2);
 const admission={prepare(object,{signal}){return new Promise((resolve,reject)=>{requests.push({object,signal,resolve,reject});signal.addEventListener('abort',()=>reject(new DOMException('Cancelled','AbortError')),{once:true});});}};
 const owner=createWebGpuSettlements({scene,state,residency:{get:(cx,cz)=>heights.get(cx+','+cz)??null},pipelineAdmission:admission,onCameraStructures:value=>snapshots.push(value),onError:error=>errors.push(error.message)});
 owner.sync();await until(()=>requests.length===1);requests[0].resolve();await until(()=>owner.status().units===1&&owner.status().selectableReady);
 const group=scene.children.find(item=>item.userData.entityId==='village-1'),visible=()=>group.children.flatMap(root=>root.visible?root.children:[]);
 return {scene,state,requests,errors,owner,terrain,heights,group,visible,snapshots,async publish(index){requests[index].resolve();await turn();await turn();},async dispose(){owner.dispose();await turn();for(const mesh of meshes){mesh.geometry.dispose();mesh.material.dispose();}globalThis.fetch=originalFetch;if(originalBitmap===undefined)delete globalThis.createImageBitmap;else globalThis.createImageBitmap=originalBitmap;}};
}

test('confirmed village retains actual objects and camera geometry through unrelated terrain notifications',async()=>{
 const f=await fixture();try{const old=f.visible()[0],geometry=old.geometry,material=old.material,camera=f.snapshots.at(-1);
  for(let n=0;n<30;n++){f.owner.terrainChanged();f.owner.sync();}await turn();
  assert.equal(f.requests.length,1);assert.deepEqual(f.visible(),[old]);assert.equal(old.geometry,geometry);assert.equal(old.material,material);assert.equal(f.owner.status().selectableReady,true);assert.deepEqual(f.snapshots.at(-1),camera);assert.deepEqual(f.errors,[]);
 }finally{await f.dispose();}
});

test('replacement terrain with equal sampled height preserves the admitted village',async()=>{
 const f=await fixture();try{const old=f.visible()[0];f.terrain(2);f.owner.terrainChanged();await turn();assert.equal(f.requests.length,1);assert.deepEqual(f.visible(),[old]);assert.equal(f.owner.status().selectableReady,true);}finally{await f.dispose();}
});

test('a changed building support height admits a real replacement while retaining the previous group',async()=>{
 const f=await fixture();try{const old=f.visible()[0],before=old.position.y;f.terrain(5);f.owner.terrainChanged();await until(()=>f.requests.length===2);
  assert.deepEqual(f.visible(),[old]);assert.equal(f.owner.status().selectableReady,false);assert.equal(f.snapshots.at(-1).complete,false);
  const candidate=f.requests[1].object.children[0];assert.equal(candidate.position.y,5.018);assert(Math.abs(candidate.position.y-before-3)<1e-12);assert.equal(candidate.geometry,old.geometry);assert.equal(candidate.material,old.material);
  await f.publish(1);assert.deepEqual(f.visible(),[candidate]);assert.equal(old.parent,null);assert.equal(f.owner.status().selectableReady,true);assert.equal(f.snapshots.at(-1).complete,true);assert.deepEqual(f.errors,[]);
 }finally{await f.dispose();}
});

test('unchanged pending support does not restart admission and a reversion cancels only the candidate',async()=>{
 const f=await fixture();try{const old=f.visible()[0];f.terrain(5);f.owner.terrainChanged();await until(()=>f.requests.length===2);for(let n=0;n<20;n++)f.owner.terrainChanged();await turn();assert.equal(f.requests.length,2);assert.equal(f.requests[1].signal.aborted,false);
  f.terrain(2);f.owner.terrainChanged();assert.equal(f.requests[1].signal.aborted,true);await f.publish(1);assert.equal(f.requests.length,2);assert.deepEqual(f.visible(),[old]);assert.equal(f.owner.status().selectableReady,true);assert.deepEqual(f.errors,[]);
 }finally{await f.dispose();}
});

test('residence loss and return change the actual village projection without inventing a height',async()=>{
 const f=await fixture();try{const old=f.visible()[0];f.heights.delete('0,0');f.owner.terrainChanged();await until(()=>f.requests.length===2);assert.deepEqual(f.visible(),[old]);assert.equal(f.requests[1].object.children.length,0);await f.publish(1);assert.equal(f.visible().length,0);
  f.terrain(2);f.owner.terrainChanged();await until(()=>f.requests.length===3);await f.publish(2);assert.equal(f.visible().length,1);assert.equal(f.visible()[0].position.y,old.position.y);assert.deepEqual(f.errors,[]);
 }finally{await f.dispose();}
});

test('confirmed key, coordinate, yaw and order changes still replace the village layout',async()=>{
 const f=await fixture();try{let old=f.visible()[0];const building=f.state.villages[0].buildings[0];for(const change of [()=>{building.key='hut';},()=>{building.x=4;},()=>{building.yaw=.6;},()=>{f.state.villages[0].buildings.push({key:'house',x:2,z:1});},()=>{f.state.villages[0].buildings.reverse();}]){
   const index=f.requests.length;change();f.owner.sync();await until(()=>f.requests.length===index+1);assert.equal(f.visible()[0],old);await f.publish(index);assert.notEqual(f.visible()[0],old);old=f.visible()[0];assert.equal(f.owner.status().selectableReady,true);
  }assert.deepEqual(f.errors,[]);
 }finally{await f.dispose();}
});

test('a failed changed projection can retry on an unchanged notification while preserving the old village',async()=>{
 const f=await fixture();try{const old=f.visible()[0];f.terrain(5);f.owner.terrainChanged();await until(()=>f.requests.length===2);f.requests[1].reject(Error('temporary admission failure'));await turn();await turn();
  assert.deepEqual(f.visible(),[old]);assert.equal(f.owner.status().selectableReady,false);f.owner.terrainChanged();await until(()=>f.requests.length===3);await f.publish(2);
  assert.notEqual(f.visible()[0],old);assert.equal(f.visible()[0].position.y,5.018);assert.equal(f.owner.status().selectableReady,true);assert.deepEqual(f.errors,['temporary admission failure']);
 }finally{await f.dispose();}
});

test('reverting a pending residence loss restores the visible-layout readiness proof',async()=>{
 const f=await fixture();try{const old=f.visible()[0];f.heights.delete('0,0');f.owner.terrainChanged();await until(()=>f.requests.length===2);assert.equal(f.requests[1].object.children.length,0);
  f.terrain(2);f.owner.terrainChanged();await turn();assert.equal(f.requests[1].signal.aborted,true);assert.deepEqual(f.visible(),[old]);assert.equal(f.owner.status().selectableReady,true);
  f.group.visible=false;assert.equal(f.owner.status().selectableReady,false,'the restored visible layout still participates in readiness');f.group.visible=true;
  await f.publish(1);assert.deepEqual(f.visible(),[old]);assert.deepEqual(f.errors,[]);
 }finally{await f.dispose();}
});
