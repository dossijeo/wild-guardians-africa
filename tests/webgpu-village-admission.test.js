import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Object3D} from 'three';
import {createWebGpuAdmittedVillage} from '../src/rendering/webgpu-village-admission.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const requests=[],errors=[];let ready=0;
 const pipelineAdmission={prepare(object,{signal}){return new Promise((resolve,reject)=>{requests.push({object,signal,resolve,reject});signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true});});}};
 const view=createWebGpuAdmittedVillage({pipelineAdmission,onReady:()=>ready++,onError:error=>errors.push(error.message)});
 const build=name=>()=>{const group=new Group(),mesh=new Object3D();mesh.name=name;group.add(mesh);return group;};
 return {view,requests,errors,build,get ready(){return ready;}};
}
test('the previous confirmed village remains visible while a new layout is admitted',async()=>{
 const f=fixture();f.view.update('v1',f.build('old'));await turn();assert.equal(f.view.ready,false);f.requests[0].resolve();await turn();
 assert.equal(f.view.meshes[0].name,'old');assert.equal(f.view.upToDate,true);f.view.update('v2',f.build('new'));await turn();
 assert.equal(f.view.meshes[0].name,'old');assert.equal(f.view.upToDate,false);f.requests[1].resolve();await turn();assert.equal(f.view.meshes[0].name,'new');assert.equal(f.view.upToDate,true);assert.equal(f.ready,2);f.view.dispose();
});
test('obsolete or failed layouts are never shown',async()=>{
 const f=fixture();f.view.update('v1',f.build('old'));await turn();f.requests[0].resolve();await turn();f.view.update('v2',f.build('obsolete'));await turn();f.view.update('v3',f.build('next'));await turn();
 assert.equal(f.requests[1].signal.aborted,true);f.requests[1].resolve();f.requests[2].reject(Error('pipeline failed'));await turn();
 assert.equal(f.view.meshes[0].name,'old');assert.equal(f.view.upToDate,false);assert.deepEqual(f.errors,['pipeline failed']);f.view.dispose();
});
