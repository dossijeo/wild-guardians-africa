import test from 'node:test';
import assert from 'node:assert/strict';
import {Group} from 'three';
import {createWebGpuWorkerRoster} from '../src/rendering/webgpu-worker-roster.js';
const flush=()=>new Promise(resolve=>setImmediate(resolve));
const actions={Run:{status:'fleeing',running:true},Harvest:{status:'acting',task:'harvest'},Idle:{status:'idle'},Alert:{status:'idle',idleState:{mode:'watch'}},Water:{status:'acting',task:'water'},Plant:{status:'acting',task:'initial',actionRemaining:10},Carry:{status:'carrying',crateId:'crate'}};
for(const [action,fields] of Object.entries(actions))for(const cancelled of [false,true])test(`${action}: ${cancelled?'cancellation retries on state':'failure cannot resubmit itself'}`,async()=>{
 const {task,...values}=fields,entity={id:'w',profile:'youngMale',taskId:'task',...values},state={workers:[entity],tasks:task?[{id:'task',kind:task,targetId:'plant'}]:[],crates:[{id:'crate',carrierId:'w',delivered:false}]},root=new Group();let attempts=0;const errors=[];
 const roster=createWebGpuWorkerRoster({scene:new Group(),residency:{},state,renderer:{backend:{isWebGPUBackend:true}},assetBank:{dispose(){}},pipelineAdmission:{prepare:async()=>{}},['baked'+action+'Bank']:{get:async()=>({})},onBakedWalkError:(_,error)=>errors.push(error),createWorker:async()=>({root,update(){},async ['installBaked'+action](){if(++attempts===1)throw cancelled?new DOMException('superseded','AbortError'):Error('invalid resource');return true;},dispose(){}})});
 try{roster.sync();await flush();await flush();assert.equal(attempts,1);assert.equal(errors.length,cancelled?0:1);roster.sync();await flush();await flush();assert.equal(attempts,cancelled?2:1);roster.sync();await flush();assert.equal(attempts,cancelled?2:1);if(!cancelled){const status=entity.status;entity.status='incapacitated';roster.sync();await flush();entity.status=status;roster.sync();await flush();assert.equal(attempts,2);}}finally{roster.dispose();}
});
