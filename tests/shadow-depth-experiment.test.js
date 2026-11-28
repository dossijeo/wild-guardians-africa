import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,SkinnedMesh,BufferGeometry,MeshStandardMaterial,Vector4,FrontSide,BackSide,VSMShadowMap,PCFShadowMap,DirectionalLight,PointLight} from 'three';
import {prepareShadowDepthExperiment} from '../tools/experiments/prepare-shadow-depth.js';
import {canPrepareSkinnedShadowPrograms} from '../src/rendering/prepare-skinned-shadows.js';

function fixture(){
 const scene=new Group(),original=new MeshStandardMaterial({side:FrontSide}),mesh=new SkinnedMesh(new BufferGeometry(),original);mesh.castShadow=true;scene.add(mesh);
 const previous={name:'previous'},gl={isContextLost:()=>false};let target=previous,cube=3,mip=2,viewport=new Vector4(1,2,3,4),scissor=new Vector4(5,6,7,8),scissorTest=true,targetDisposed=0,depthDisposed=0,temp;
 const renderer={info:{programs:[]},getContext:()=>gl,getRenderTarget:()=>target,getActiveCubeFace:()=>cube,getActiveMipmapLevel:()=>mip,getViewport:v=>v.copy(viewport),getScissor:v=>v.copy(scissor),getScissorTest:()=>scissorTest,setRenderTarget:(v,c=0,m=0)=>{target=v;cube=c;mip=m;viewport.set(0,0,1,1);scissor.set(0,0,1,1);if(v&&v!==previous)v.addEventListener('dispose',()=>targetDisposed++);},setViewport:v=>viewport.copy(v),setScissor:v=>scissor.copy(v),setScissorTest:v=>{scissorTest=v;}};
 const compile=(_renderer,view,_camera,targetScene,options)=>{view.traverse(object=>{temp=object.material;assert.ok(temp.isMeshDepthMaterial);assert.equal(temp.side,BackSide);assert.equal(targetScene.fog,null);temp.addEventListener('dispose',()=>depthDisposed++);});return fixture.pending?.(options)??Promise.resolve();};
 const state=()=>({target,cube,mip,viewport:viewport.toArray(),scissor:scissor.toArray(),scissorTest,material:mesh.material,targetDisposed,depthDisposed,temp});
 return {scene,original,mesh,renderer,previous,compile,state};
}
function restored(f){const s=f.state();assert.equal(s.target,f.previous);assert.equal(s.cube,3);assert.equal(s.mip,2);assert.deepEqual(s.viewport,[1,2,3,4]);assert.deepEqual(s.scissor,[5,6,7,8]);assert.equal(s.scissorTest,true);assert.equal(s.material,f.original);}

test('restores native material and render target before awaiting and retains program owners until explicit disposal',async()=>{
 const f=fixture();let resume;const held=new Promise(resolve=>{resume=resolve;});fixture.pending=()=>held;
 try{const p=prepareShadowDepthExperiment(f.renderer,f.scene,{}, {compile:f.compile,nextFrame:async()=>{}});restored(f);assert.equal(f.state().depthDisposed,0);resume();const result=await p;restored(f);assert.equal(result.meshes,1);assert.equal(f.state().targetDisposed,1);assert.equal(f.state().depthDisposed,0);result.dispose();assert.equal(f.state().depthDisposed,1);}finally{delete fixture.pending;}
});

test('failure during synchronous submission restores state and disposes temporary material and target',async()=>{
 const f=fixture(),compile=(...args)=>{f.compile(...args);throw Error('compile fault');};
 await assert.rejects(prepareShadowDepthExperiment(f.renderer,f.scene,{}, {compile}),/compile fault/);restored(f);assert.equal(f.state().depthDisposed,1);assert.equal(f.state().targetDisposed,1);
});

test('cancellation while a frame is suspended releases resources without waiting for that frame',async()=>{
 const f=fixture(),owner=new AbortController();let waiting;const started=new Promise(resolve=>{waiting=resolve;});
 const p=prepareShadowDepthExperiment(f.renderer,f.scene,{}, {compile:f.compile,signal:owner.signal,nextFrame:()=>{waiting();return new Promise(()=>{});}});
 await started;restored(f);owner.abort();await assert.rejects(p,/cancelled|abort/i);assert.equal(f.state().depthDisposed,1);assert.equal(f.state().targetDisposed,1);
});

test('only prepares compatible directional shadow configurations',()=>{
 const scene=new Group(),directional=new DirectionalLight(),point=new PointLight(),renderer={shadowMap:{enabled:true,type:PCFShadowMap}};directional.castShadow=true;scene.add(directional,point);
 assert.equal(canPrepareSkinnedShadowPrograms(renderer,scene),true);point.castShadow=true;assert.equal(canPrepareSkinnedShadowPrograms(renderer,scene),false);point.visible=false;assert.equal(canPrepareSkinnedShadowPrograms(renderer,scene),true);
 renderer.shadowMap.type=VSMShadowMap;assert.equal(canPrepareSkinnedShadowPrograms(renderer,scene),false);renderer.shadowMap.type=PCFShadowMap;renderer.shadowMap.enabled=false;assert.equal(canPrepareSkinnedShadowPrograms(renderer,scene),false);
});

test('a restored graphics context invalidates work started in an earlier resource epoch',async()=>{
 const f=fixture();let epoch=0,started;const waiting=new Promise(resolve=>{started=resolve;});
 const p=prepareShadowDepthExperiment(f.renderer,f.scene,{}, {compile:f.compile,getEpoch:()=>epoch,nextFrame:()=>{started();return new Promise(()=>{});}});
 await waiting;epoch++;await assert.rejects(p,/cancelled/);restored(f);assert.equal(f.state().depthDisposed,1);assert.equal(f.state().targetDisposed,1);
});
