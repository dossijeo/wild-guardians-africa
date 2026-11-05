import test from 'node:test';
import assert from 'node:assert/strict';
import {Group,Mesh,BoxGeometry,MeshBasicMaterial} from 'three';
import {createWebGpuAdmittedCenterDamage} from '../src/rendering/webgpu-center-damage-admission.js';

const turn=()=>new Promise(resolve=>setImmediate(resolve));
function fixture(){
 const group=new Group(),body=new Mesh(new BoxGeometry(),new MeshBasicMaterial()),ash=new Mesh(new BoxGeometry(),new MeshBasicMaterial()),requests=[],updates=[],errors=[];group.add(body,ash);let disposed=0,ready=0;
 const damage={group,update(entity,time){updates.push({hp:entity.hp,time});body.visible=entity.status!=='ruined';ash.visible=entity.status==='ruined'||entity.hp/entity.maxHp<.77;},prepare(){},status(){return {};},dispose(){disposed++;}};
 const pipelineAdmission={prepare(object,{signal}){return new Promise((resolve,reject)=>{requests.push({object,signal,resolve,reject});signal.addEventListener('abort',()=>reject(new DOMException('cancelled','AbortError')),{once:true});});}};
 const view=createWebGpuAdmittedCenterDamage({damage,pipelineAdmission,onReady:()=>ready++,onError:error=>errors.push(error.message)});
 return {view,damage,body,ash,requests,updates,errors,get ready(){return ready;},get disposed(){return disposed;},cleanup(){view.dispose();body.geometry.dispose();body.material.dispose();ash.geometry.dispose();ash.material.dispose();}};
}
test('keeps one effect instance and current phase until its actual new mesh is ready',async()=>{
 const f=fixture();try{f.view.update({status:'intact',hp:90,maxHp:100},1);await turn();assert.equal(f.requests[0].object,f.damage.group);assert.equal(f.view.ready,false);f.requests[0].resolve();await turn();assert.equal(f.view.ready,true);
  f.view.update({status:'intact',hp:50,maxHp:100},2);await turn();assert.equal(f.requests[1].object,f.ash);assert.equal(f.ash.visible,false);assert.equal(f.updates.at(-1).hp,90);f.requests[1].resolve();await turn();assert.equal(f.ash.visible,true);assert.equal(f.updates.at(-1).hp,50);assert.equal(f.disposed,0);assert.equal(f.ready,2);
 }finally{f.cleanup();}
});
test('obsolete phase requests cannot change the current visible state',async()=>{
 const f=fixture();try{f.view.update({status:'intact',hp:90,maxHp:100},1);await turn();f.requests[0].resolve();await turn();f.view.update({status:'intact',hp:50,maxHp:100},2);await turn();f.view.update({status:'intact',hp:95,maxHp:100},3);assert.equal(f.requests[1].signal.aborted,true);f.requests[1].resolve();await turn();assert.equal(f.ash.visible,false);assert.equal(f.updates.at(-1).hp,95);assert.deepEqual(f.errors,[]);
 }finally{f.cleanup();}
});
test('failed admission preserves the last visible damage phase',async()=>{
 const f=fixture();try{f.view.update({status:'intact',hp:90,maxHp:100},1);await turn();f.requests[0].resolve();await turn();f.view.update({status:'intact',hp:50,maxHp:100},2);await turn();f.requests[1].reject(Error('pipeline failed'));await turn();assert.equal(f.view.ready,true);assert.equal(f.view.upToDate,false);assert.equal(f.ash.visible,false);assert.equal(f.updates.at(-1).hp,90);assert.deepEqual(f.errors,['pipeline failed']);}finally{f.cleanup();}
});
