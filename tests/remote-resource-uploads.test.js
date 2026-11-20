import test from 'node:test';
import assert from 'node:assert/strict';
import {externalImageUploadRegions} from '../src/rendering/remote-resource-uploads.js';
import {createRemoteWebGpuHost} from '../src/rendering/remote-webgpu-host.js';
import {fakeGpu,pair} from './helpers/remote-webgpu-fixture.js';
const texture={width:1024,height:1024,depthOrArrayLayers:2,mipLevelCount:1,dimension:'2d'};
for(const flipY of [false,true])test('image regions preserve source crop, flip and destination coordinates: '+flipY,()=>{
 const op={method:'copyExternalImageToTexture',args:[{source:{width:1024,height:1024},origin:{x:7,y:9},flipY},{texture:{__remoteGpuId:'image'},origin:{x:13,y:17,z:1},premultipliedAlpha:false,colorSpace:'display-p3'},[601,513,1]]};
 const regions=[...externalImageUploadRegions(op,texture,256)],seen=new Set();
 for(const r of regions){const [s,d,n]=r.args;assert(n.width<=256&&n.height<=256);assert.equal(d.colorSpace,'display-p3');assert.equal(d.premultipliedAlpha,false);assert.equal(d.origin.z,1);
  for(let y=0;y<n.height;y++)for(let x=0;x<n.width;x++){
   const targetX=d.origin.x+x-13,targetY=d.origin.y+y-17,key=targetY*601+targetX;assert(!seen.has(key));seen.add(key);
   assert.equal(s.origin.x+x,7+targetX);assert.equal(s.origin.y+(flipY?n.height-1-y:y),9+(flipY?512-targetY:targetY));
  }
 }
 assert.equal(seen.size,601*513);assert.equal(op.args[0].origin.x,7);
});
test('an invalid full destination extent is not legalized by partial region writes',()=>{
 const op={method:'copyExternalImageToTexture',args:[{source:{width:2048,height:2048}},{texture:{},origin:[900,0,0]},[512,512,1]]};
 assert.deepEqual([...externalImageUploadRegions(op,texture)],[op]);
});
test('large external upload yields inside the copy and holds its exact texture until interruption',async()=>{
 const gpu=fakeGpu(),[,port]=pair();let copies=0,closed=0,release,entered;
 const gate=new Promise(resolve=>{entered=resolve;});
 gpu.device.createTexture=()=>({...texture,width:2048,height:2048,createView(){},destroy(){}});
 gpu.device.queue.copyExternalImageToTexture=(s,d,n)=>{assert(n.width<=1024&&n.height<=1024);copies++;};
 const host=createRemoteWebGpuHost({...gpu,port,canvas:{width:1,height:1},requestFrame:()=>0,cancelFrame(){},resourceSliceMs:0,yieldResourceTask:()=>new Promise(resolve=>{release=resolve;entered();})});
 await host.handle({type:'create',method:'createTexture',id:'image',descriptor:{}});
 const uploading=host.handle({type:'operation',op:{method:'copyExternalImageToTexture',args:[{source:{width:2048,height:2048,close(){closed++;}}},{texture:{__remoteGpuId:'image'}},[2048,2048,1]]}});
 await gate;assert.equal(copies,1);assert.equal(closed,0);
 await host.dispose();release();await assert.rejects(uploading,/cancelled/);assert.equal(copies,1);assert.equal(closed,1);
});
