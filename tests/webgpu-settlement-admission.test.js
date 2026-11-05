import test from 'node:test';
import assert from 'node:assert/strict';
import * as THREE from 'three';
import {createWebGpuSettlements} from '../src/rendering/webgpu-settlements.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));

async function fixture(){
 const previousFetch=globalThis.fetch;
 globalThis.fetch=async url=>({ok:true,json:async()=>String(url).includes('destruction')?{buildings:[{culture:'mapungubwe',url:'/center.glb'}]}:[]});
 const scene=new THREE.Scene(),terrain=new THREE.Mesh(new THREE.PlaneGeometry(20,20),new THREE.MeshBasicMaterial({side:THREE.DoubleSide}));terrain.rotation.x=-Math.PI/2;terrain.updateMatrixWorld(true);
 const state={culture:'mapungubwe',elapsed:0,villages:[],structures:[{id:'c1',kind:'center',culture:'mapungubwe',status:'intact',x:0,z:0,yaw:0,hp:10,maxHp:10}]};
 let finish,fail,signal,started=0,disposed=0;const errors=[];
 const root=new THREE.Group();root.add(new THREE.Mesh(new THREE.BoxGeometry(),new THREE.MeshBasicMaterial()));
 const pipelineAdmission={prepare(group,options){assert.equal(group.children[0],root);signal=options.signal;return new Promise((resolve,reject)=>{finish=resolve;fail=reject;signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true});});}};
 const view=createWebGpuSettlements({scene,state,residency:{get:()=>terrain},renderer:{backend:{isWebGPUBackend:true}},pipelineAdmission,onError:error=>errors.push(error.message),loadProgressiveCenter:async()=>({preview:{scene:root},start(){started++;},tick(){},dispose(){disposed++;}})});
 view.sync();for(let i=0;i<10&&!finish;i++)await turn();assert.ok(finish,'center must request admission');
 return {view,scene,state,finish,fail,errors,get signal(){return signal;},get started(){return started;},get disposed(){return disposed;},cleanup(){view.dispose();terrain.geometry.dispose();terrain.material.dispose();root.children[0].geometry.dispose();root.children[0].material.dispose();globalThis.fetch=previousFetch;}};
}

test('a center is published only after its loaded model is admitted',async()=>{
 const f=await fixture();try{assert.equal(f.view.status().centers,0);assert.equal(f.started,0);f.finish();await turn();assert.equal(f.view.status().centers,1);assert.equal(f.started,1);assert.equal(f.scene.children.length,1);}finally{f.cleanup();}
});

test('closing the scene cancels a pending center without publishing it',async()=>{
 const f=await fixture();try{f.view.dispose();assert.equal(f.signal.aborted,true);await turn();assert.equal(f.view.status().centers,0);assert.equal(f.started,0);assert.equal(f.disposed,1);}finally{f.cleanup();}
});

test('a failed admission reports the error and does not expose the center',async()=>{
 const f=await fixture();try{f.fail(Error('pipeline failed'));await turn();assert.deepEqual(f.errors,['pipeline failed']);assert.equal(f.view.status().centers,0);assert.equal(f.scene.children.length,0);assert.equal(f.started,0);}finally{f.cleanup();}
});
